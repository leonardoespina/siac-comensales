/**
 * SERVICIO: Biometría Facial y Control de Acceso Hikvision (ISAPI)
 * 
 * REGLAS DE ARQUITECTURA:
 * - Orquesta la comunicación con los biométricos Hikvision y los repositorios de datos.
 * - Cero imports directos de Prisma (usa biometricRepository).
 * - Cero conocimiento del contexto HTTP de Nuxt (H3 / readBody).
 * - Emite eventos tipados mediante emitEvent.
 */

import https from 'https'
import http from 'http'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { URL } from 'url'
import {
  HikvisionDeviceConfig,
  HikvisionDigestChallenge,
  HikvisionFingerprintItem,
  BiometricDetectionEvent,
  BiometricSyncResult,
  BiometricSyncTarget,
  BiometricDeleteResult,
  BiometricDeleteTarget,
  HikvisionConnectionError,
  HikvisionAuthError,
  sanitizeEmployeeNo,
  mapVerifyMode,
  buildDeviceBaseUrl
} from '../domain/biometrics'
import * as biometricRepo from '../repository/biometricRepository'
import { emitEvent } from '../utils/eventBus'

// ── CACHE DE RETOS DIGEST POR DISPOSITIVO ─────────────────────────────────────
const challengeCache = new Map<string, HikvisionDigestChallenge>()

// ── ANTI-REBOTE EN MEMORIA PARA DETECCIONES Y SINCRONIZACIONES ─────────────────
const recentDetections = new Map<string, number>()
const syncingDiners = new Set<string>()

// ── STORAGE DIR PARA ROSTROS ──────────────────────────────────────────────────
const STORAGE_FACES_DIR = path.join(process.cwd(), 'storage', 'biometrics', 'faces')

function ensureStorageDirExists() {
  if (!fs.existsSync(STORAGE_FACES_DIR)) {
    fs.mkdirSync(STORAGE_FACES_DIR, { recursive: true })
  }
}

// ── HELPERS CRIPTOGRÁFICOS DIGEST AUTH ────────────────────────────────────────

function parseDigestHeader(header: string): HikvisionDigestChallenge {
  const challenge: Record<string, string> = {}
  const matches = header.replace(/^Digest\s+/, '').matchAll(/(\w+)="?([^",]+)"?/g)
  for (const match of matches) {
    challenge[match[1]] = match[2]
  }
  return challenge as unknown as HikvisionDigestChallenge
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

function buildDigestAuthHeader(
  method: string,
  uri: string,
  challenge: HikvisionDigestChallenge,
  username: string,
  password: string
): string {
  const ha1 = md5(`${username}:${challenge.realm}:${password}`)
  const ha2 = md5(`${method}:${uri}`)

  if (challenge.qop && challenge.qop.includes('auth')) {
    const nc = '00000001'
    const cnonce = crypto.randomBytes(8).toString('hex')
    const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`)

    let header = `Digest username="${username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}", qop=auth, nc=${nc}, cnonce="${cnonce}"`
    if (challenge.opaque) header += `, opaque="${challenge.opaque}"`
    return header
  } else {
    const response = md5(`${ha1}:${challenge.nonce}:${ha2}`)
    let header = `Digest username="${username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}"`
    if (challenge.opaque) header += `, opaque="${challenge.opaque}"`
    return header
  }
}

async function fetchDeviceChallenge(device: HikvisionDeviceConfig): Promise<HikvisionDigestChallenge> {
  const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
  const fullUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
  const isHttps = fullUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined

  return new Promise((resolve, reject) => {
    const req = requestModule.request(fullUrl, { method: 'GET', agent, timeout: 5000 }, (res) => {
      const wwwAuth = res.headers['www-authenticate']
      if (res.statusCode === 401 && wwwAuth) {
        const challenge = parseDigestHeader(wwwAuth)
        challengeCache.set(device.ip, challenge)
        resolve(challenge)
      } else if (res.statusCode === 200) {
        reject(new HikvisionAuthError(device.ip, 'Dispositivo respondió 200 sin exigir autenticación Digest'))
      } else {
        reject(new HikvisionConnectionError(device.ip, `Respuesta inesperada [HTTP ${res.statusCode}]`))
      }
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new HikvisionConnectionError(device.ip, 'Timeout de conexión (5s)'))
    })

    req.on('error', (err) => {
      reject(new HikvisionConnectionError(device.ip, err.message))
    })

    req.end()
  })
}

// ── CLIENTE HTTP ISAPI CON DIGEST AUTH ────────────────────────────────────────

export async function executeIsapiRequest(
  device: HikvisionDeviceConfig,
  endpoint: string,
  method = 'GET',
  bodyData?: string | Buffer,
  contentType = 'application/json; charset=UTF-8'
): Promise<{ statusCode: number; data: string; buffer: Buffer }> {
  let challenge = challengeCache.get(device.ip)
  if (!challenge) {
    challenge = await fetchDeviceChallenge(device)
  }

  const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
  const fullUrl = new URL(endpoint, baseUrl)
  const isHttps = fullUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined

  const sendWithChallenge = (chal: HikvisionDigestChallenge): Promise<{ statusCode: number; data: string; buffer: Buffer }> => {
    return new Promise((resolve, reject) => {
      const authHeader = buildDigestAuthHeader(
        method,
        fullUrl.pathname + fullUrl.search,
        chal,
        device.user || 'admin',
        device.password || ''
      )

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': contentType,
        'Accept': '*/*'
      }

      if (bodyData) {
        headers['Content-Length'] = Buffer.isBuffer(bodyData)
          ? bodyData.length.toString()
          : Buffer.byteLength(bodyData).toString()
      }

      const req = requestModule.request(fullUrl, { method, agent, headers, timeout: 8000 }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve({
            statusCode: res.statusCode || 500,
            data: buffer.toString('utf8'),
            buffer
          })
        })
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new HikvisionConnectionError(device.ip, 'Timeout en petición ISAPI'))
      })

      req.on('error', (err) => {
        reject(new HikvisionConnectionError(device.ip, err.message))
      })

      if (bodyData) req.write(bodyData)
      req.end()
    })
  }

  let res = await sendWithChallenge(challenge)

  // Si la nonce expiró (401), refrescar challenge y reintentar
  if (res.statusCode === 401) {
    challenge = await fetchDeviceChallenge(device)
    res = await sendWithChallenge(challenge)
  }

  return res
}

// ── DESCARGA Y EXTRACCIÓN DE FOTO DESDE TERMINAL DE ORIGEN ────────────────────

/**
 * Consulta un terminal para extraer la foto del rostro enrolado y guardarla en disco.
 */
export async function fetchAndStoreFaceFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<string | null> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) return null

  ensureStorageDirExists()

  // 1. Buscar usuario en el terminal para obtener faceURL
  const searchBody = JSON.stringify({
    UserInfoSearchCond: {
      searchID: '1',
      searchResultPosition: 0,
      maxResults: 1,
      EmployeeNoList: [{ employeeNo: cleanCedula }]
    }
  })

  const userRes = await executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/Search?format=json', 'POST', searchBody)
  if (userRes.statusCode !== 200) return null

  try {
    const parsed = JSON.parse(userRes.data)
    const user = parsed.UserInfoSearch?.UserInfo?.[0]
    if (!user || !user.faceURL) return null

    // 2. Extraer la ruta relativa de faceURL
    const urlObj = new URL(user.faceURL)
    const relativeFacePath = urlObj.pathname + (urlObj.search || '')

    // 3. Descargar la imagen JPG original
    const picRes = await executeIsapiRequest(device, relativeFacePath, 'GET', undefined, 'image/jpeg')
    if (picRes.statusCode === 200 && picRes.buffer.length > 500) {
      const filePath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
      fs.writeFileSync(filePath, picRes.buffer)
      return `/storage/biometrics/faces/${cleanCedula}.jpg`
    }
  } catch {
    return null
  }

  return null
}

// ── INYECCIÓN DE USUARIO Y ROSTRO A UN TERMINAL DE DESTINO ─────────────────────

/**
 * Registra o actualiza un usuario y su foto facial en un terminal biométrico específico.
 */
export async function pushUserAndFaceToDevice(
  device: HikvisionDeviceConfig,
  payload: {
    cedula: string
    name: string
    photoBuffer?: Buffer | null
  }
): Promise<{ userSuccess: boolean; faceSuccess: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(payload.cedula)
  if (!cleanCedula) {
    return { userSuccess: false, faceSuccess: false, error: 'Cédula inválida' }
  }

  // 1. Registrar o actualizar ficha de usuario (UserInfo/SetUp)
  const setupBody = JSON.stringify({
    UserInfo: {
      employeeNo: cleanCedula,
      name: payload.name.slice(0, 32).toUpperCase().trim(),
      userType: 'normal',
      closeDelay: 0,
      Valid: {
        enable: true,
        beginTime: '2026-01-01T00:00:00',
        endTime: '2031-12-31T23:59:59',
        timeType: 'local'
      },
      doorRight: '1',
      RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
    }
  })

  const userRes = await executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/SetUp?format=json', 'PUT', setupBody)
  const userSuccess = userRes.statusCode === 200

  if (!userSuccess) {
    return { userSuccess: false, faceSuccess: false, error: `Error creando usuario: [HTTP ${userRes.statusCode}] ${userRes.data}` }
  }

  // 2. Si se proporciona foto, inyectarla vía FDLib/FaceDataRecord
  let faceSuccess = false
  if (payload.photoBuffer && payload.photoBuffer.length > 500) {
    const boundary = '----HikvisionSIACSyncBoundary'
    const jsonPart = JSON.stringify({
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: cleanCedula
    })

    let headerStr = `--${boundary}\r\n`
    headerStr += 'Content-Disposition: form-data; name="FaceDataRecord"\r\n'
    headerStr += 'Content-Type: application/json\r\n\r\n'
    headerStr += jsonPart + '\r\n'
    headerStr += `--${boundary}\r\n`
    headerStr += 'Content-Disposition: form-data; name="FaceImage"; filename="face.jpg"\r\n'
    headerStr += 'Content-Type: image/jpeg\r\n\r\n'

    const headBuf = Buffer.from(headerStr, 'utf8')
    const tailBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    const multipartBody = Buffer.concat([headBuf, payload.photoBuffer, tailBuf])

    const faceRes = await executeIsapiRequest(
      device,
      '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json',
      'POST',
      multipartBody,
      `multipart/form-data; boundary=${boundary}`
    )

    faceSuccess = faceRes.statusCode === 200
  }

  return { userSuccess, faceSuccess }
}

// ── EXTRACCIÓN E INYECCIÓN DE HUELLAS DACTILARES EN DISPOSITIVO ────────────────

/**
 * Consulta un terminal para extraer la plantilla biométrica de huella de un usuario.
 */
export async function fetchFingerprintFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string,
  fingerPrintID = 1
): Promise<HikvisionFingerprintItem | null> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) return null

  // Hikvision requiere un searchID único por transacción
  const searchId = String(Date.now())
  const searchBody = JSON.stringify({
    FingerPrintCond: {
      searchID: searchId,
      employeeNo: cleanCedula,
      enableCardReader: [1],
      fingerPrintID
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/FingerPrintUpload?format=json',
      'POST',
      searchBody
    )
    if (res.statusCode !== 200) return null

    const parsed = JSON.parse(res.data)
    const fpItem = parsed.FingerPrintInfo?.FingerPrintList?.[0]
    if (fpItem && fpItem.fingerData) {
      return {
        cardReaderNo: fpItem.cardReaderNo || 1,
        fingerPrintID: fpItem.fingerPrintID || fingerPrintID,
        fingerType: fpItem.fingerType || 'normalFP',
        fingerData: fpItem.fingerData
      }
    }
  } catch (err: any) {
    console.error(`❌ [Hikvision FP] Error extrayendo huella para ${cleanCedula} en ${device.diningRoomName}:`, err?.message || err)
  }

  return null
}

/**
 * Inyecta una plantilla biométrica de huella dactilar hacia un terminal específico.
 */
export async function pushFingerprintToDevice(
  device: HikvisionDeviceConfig,
  payload: {
    cedula: string
    fpItem: HikvisionFingerprintItem
  }
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(payload.cedula)
  if (!cleanCedula) return { success: false, error: 'Cédula inválida' }

  const body = JSON.stringify({
    FingerPrintCfg: {
      employeeNo: cleanCedula,
      enableCardReader: [payload.fpItem.cardReaderNo || 1],
      fingerPrintID: payload.fpItem.fingerPrintID || 1,
      fingerType: payload.fpItem.fingerType || 'normalFP',
      fingerData: payload.fpItem.fingerData
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/FingerPrintDownload?format=json',
      'POST',
      body
    )
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── ELIMINACIÓN DE USUARIOS Y ROSTROS EN DISPOSITIVO ──────────────────────────

/**
 * Elimina un usuario y todas sus credenciales de un terminal específico.
 */
export async function deleteUserFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    return { success: false, error: 'Cédula inválida' }
  }

  const deleteBody = JSON.stringify({
    UserInfoDelCond: {
      EmployeeNoList: [{ employeeNo: cleanCedula }]
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/UserInfo/Delete?format=json',
      'PUT',
      deleteBody
    )
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Elimina la foto facial de un usuario en un terminal específico.
 */
export async function deleteFaceFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    return { success: false, error: 'Cédula inválida' }
  }

  const deleteBody = JSON.stringify({
    FDLibCondition: {
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: cleanCedula
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/Intelligent/FDLib/FaceDataRecord/Delete?format=json',
      'PUT',
      deleteBody
    )
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── HEALTHCHECK DE TERMINALES ─────────────────────────────────────────────────

export interface TerminalHealthStatus {
  diningRoomId: number
  diningRoomName: string
  ip: string
  online: boolean
  latencyMs?: number
  checkedAt: Date
}

/**
 * Verifica el estado de conectividad de un terminal Hikvision.
 * Hace un probe ligero GET al endpoint de info del dispositivo (sin autenticación).
 * Un 401 (Digest challenge) o 200 ambos son señal de que el terminal está vivo en red.
 */
export async function checkTerminalHealth(device: HikvisionDeviceConfig): Promise<TerminalHealthStatus> {
  const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
  const fullUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
  const isHttps = fullUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined
  const startTime = Date.now()

  return new Promise((resolve) => {
    const req = requestModule.request(fullUrl, { method: 'GET', agent, timeout: 4000 }, (res) => {
      const latencyMs = Date.now() - startTime
      const online = res.statusCode === 401 || res.statusCode === 200
      res.resume() // Consumir el body para liberar el socket
      resolve({
        diningRoomId: device.diningRoomId,
        diningRoomName: device.diningRoomName,
        ip: device.ip,
        online,
        latencyMs,
        checkedAt: new Date()
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ diningRoomId: device.diningRoomId, diningRoomName: device.diningRoomName, ip: device.ip, online: false, checkedAt: new Date() })
    })

    req.on('error', () => {
      resolve({ diningRoomId: device.diningRoomId, diningRoomName: device.diningRoomName, ip: device.ip, online: false, checkedAt: new Date() })
    })

    req.end()
  })
}

// ── ORQUESTACIÓN DE SINCRONIZACIÓN MULTI-SEDE (HUB-AND-SPOKE) ──────────────────

/**
 * Sincroniza un comensal hacia todos los comedores activos del sistema.
 */
export async function syncDinerAcrossAllTerminals(dinerId: number): Promise<BiometricSyncResult> {
  const diner = await biometricRepo.getDinerWithBiometricsById(dinerId)
  if (!diner) {
    throw new Error(`Comensal con ID ${dinerId} no encontrado`)
  }

  const cleanCedula = sanitizeEmployeeNo(diner.cedula)
  const diningRooms = await biometricRepo.listActiveBiometricDiningRooms()

  // 1. Obtener imagen de disco o descargarla del terminal de origen
  ensureStorageDirExists()
  const localPhotoPath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  let photoBuffer: Buffer | null = null

  if (fs.existsSync(localPhotoPath)) {
    photoBuffer = fs.readFileSync(localPhotoPath)
  }

  // 1.1 Obtener huella dactilar (desde BD o consultando terminales activos)
  let fpItem: HikvisionFingerprintItem | null = null
  if (diner.biometricRecord?.templates?.length) {
    fpItem = {
      cardReaderNo: 1,
      fingerPrintID: 1,
      fingerType: 'normalFP',
      fingerData: diner.biometricRecord.templates[0]
    }
  }

  // Si falta foto o huella, interrogar a los terminales activos
  if (!photoBuffer || !fpItem) {
    for (const room of diningRooms) {
      if (!room.deviceIp) continue
      const devConfig: HikvisionDeviceConfig = {
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }

      // Buscar foto si no la tenemos
      if (!photoBuffer) {
        const savedPath = await fetchAndStoreFaceFromDevice(devConfig, cleanCedula)
        if (savedPath && fs.existsSync(localPhotoPath)) {
          photoBuffer = fs.readFileSync(localPhotoPath)
        }
      }

      // Buscar huella si no la tenemos
      if (!fpItem) {
        const foundFp = await fetchFingerprintFromDevice(devConfig, cleanCedula)
        if (foundFp) {
          fpItem = foundFp
        }
      }

      if (photoBuffer && fpItem) break
    }
  }

  // 2. Replicar usuario, foto y huella hacia todos los comedores activos
  const targets: BiometricSyncTarget[] = []

  for (const room of diningRooms) {
    if (!room.deviceIp) continue
    const devConfig: HikvisionDeviceConfig = {
      diningRoomId: room.id,
      diningRoomName: room.name,
      ip: room.deviceIp,
      port: room.devicePort || 443,
      user: room.deviceUser || 'admin',
      password: room.devicePassword || '',
      enabled: room.deviceEnabled
    }

    try {
      const result = await pushUserAndFaceToDevice(devConfig, {
        cedula: cleanCedula,
        name: diner.name,
        photoBuffer
      })

      let fpSuccess = false
      if (fpItem && result.userSuccess) {
        const fpRes = await pushFingerprintToDevice(devConfig, {
          cedula: cleanCedula,
          fpItem
        })
        fpSuccess = fpRes.success
      }

      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        userSuccess: result.userSuccess,
        faceSuccess: result.faceSuccess,
        fpSuccess,
        error: result.error
      })
    } catch (e: any) {
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        userSuccess: false,
        faceSuccess: false,
        fpSuccess: false,
        error: e.message
      })
    }
  }

  // 3. Actualizar registro en PostgreSQL (almacena la huella para reflejar estado en UI)
  const updatedTemplates = fpItem?.fingerData
    ? [fpItem.fingerData]
    : (diner.biometricRecord?.templates || [])

  await biometricRepo.upsertBiometricRecord(diner.id, updatedTemplates, true)

  const totalSuccess = targets.every(t => t.userSuccess)

  // 4. Emitir evento al bus
  emitEvent('biometric:synced', {
    dinerId: diner.id,
    cedula: cleanCedula,
    success: totalSuccess,
    targetCount: targets.length
  })

  return {
    dinerId: diner.id,
    cedula: cleanCedula,
    name: diner.name,
    targets,
    fpSynced: !!fpItem,
    totalSuccess
  }
}

/**
 * Limpia y purga todos los datos biométricos (disco local, terminales físicos y BD) de un comensal.
 */
export async function clearDinerBiometricsAcrossAllTerminals(dinerId: number): Promise<BiometricDeleteResult> {
  const diner = await biometricRepo.getDinerWithBiometricsById(dinerId)
  if (!diner) {
    throw new Error(`Comensal con ID ${dinerId} no encontrado`)
  }

  const cleanCedula = sanitizeEmployeeNo(diner.cedula)
  const diningRooms = await biometricRepo.listActiveBiometricDiningRooms()

  // 1. Eliminar foto física en disco local si existe
  ensureStorageDirExists()
  const localPhotoPath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  let diskCleared = false
  if (fs.existsSync(localPhotoPath)) {
    try {
      fs.unlinkSync(localPhotoPath)
      diskCleared = true
    } catch {
      diskCleared = false
    }
  }

  // 2. Eliminar usuario/biometría en todos los terminales físicos activos
  const targets: BiometricDeleteTarget[] = []

  for (const room of diningRooms) {
    if (!room.deviceIp) continue
    const devConfig: HikvisionDeviceConfig = {
      diningRoomId: room.id,
      diningRoomName: room.name,
      ip: room.deviceIp,
      port: room.devicePort || 443,
      user: room.deviceUser || 'admin',
      password: room.devicePassword || '',
      enabled: room.deviceEnabled
    }

    try {
      const result = await deleteUserFromDevice(devConfig, cleanCedula)
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        success: result.success,
        error: result.error
      })
    } catch (e: any) {
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        success: false,
        error: e.message
      })
    }
  }

  // 3. Resetear registro en PostgreSQL (Soft-Reset de plantillas)
  await biometricRepo.clearBiometricRecord(diner.id)
  await biometricRepo.clearDinerFingerprint(diner.id)

  const totalSuccess = targets.length === 0 || targets.every(t => t.success)

  // 4. Emitir evento al bus
  emitEvent('biometric:synced', {
    dinerId: diner.id,
    cedula: cleanCedula,
    success: totalSuccess,
    targetCount: targets.length
  })

  return {
    dinerId: diner.id,
    cedula: cleanCedula,
    targets,
    diskCleared,
    dbCleared: true,
    totalSuccess
  }
}

// ── ESCUCHA EN TIEMPO REAL (ALERT STREAM POOL) ────────────────────────────────

// Registro de eventos únicos procesados para evitar duplicados en el stream
const processedEvents = new Map<string, number>()

function cleanupProcessedEvents() {
  const now = Date.now()
  for (const [key, timestamp] of processedEvents.entries()) {
    if (now - timestamp > 60000) { // Eliminar eventos de más de 1 minuto
      processedEvents.delete(key)
    }
  }
}

/**
 * Procesa de forma asíncrona un evento de acceso detectado por el biométrico.
 */
async function handleDetectedAccessEvent(
  device: HikvisionDeviceConfig,
  data: any,
  acs: any,
  onEvent?: (event: BiometricDetectionEvent) => void
) {
  const rawCedula = acs.employeeNoString.trim()
  const cleanCedula = sanitizeEmployeeNo(rawCedula)

  // 1. Filtrar eventos vacíos, heartbeat ("0") o cédulas inválidas
  if (!cleanCedula || cleanCedula === '0' || cleanCedula.length < 4) {
    return
  }

  // 2. Clave única de evento: fecha + número de serie o cédula
  const eventTime = data.dateTime || new Date().toISOString()
  const serial = acs.serialNo || data.serialNo || ''
  const eventKey = `${device.diningRoomId}_${cleanCedula}_${eventTime}_${serial}`

  if (processedEvents.has(eventKey)) {
    return // Ya fue procesado este evento exacto
  }
  processedEvents.set(eventKey, Date.now())
  cleanupProcessedEvents()

  // 3. Anti-rebote local: no procesar la misma persona en menos de 5 segundos
  const nowMs = Date.now()
  const lastSeen = recentDetections.get(cleanCedula) || 0
  if (nowMs - lastSeen < 5000) {
    return
  }
  recentDetections.set(cleanCedula, nowMs)

  // 4. Resolver nombre oficial del comensal en SIAC PostgreSQL
  const diner = await biometricRepo.getDinerWithBiometricsByCedula(cleanCedula).catch(() => null)
  const resolvedName = diner?.name || acs.name || 'Sin Nombre'

  // 5. Auto-descargar foto si es un nuevo enrolamiento y no la tenemos en disco
  ensureStorageDirExists()
  const localPhoto = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  if (!fs.existsSync(localPhoto) && !syncingDiners.has(cleanCedula)) {
    syncingDiners.add(cleanCedula)
    fetchAndStoreFaceFromDevice(device, cleanCedula)
      .then(async (savedPath) => {
        if (savedPath) {
          const currentDiner = diner || await biometricRepo.getDinerWithBiometricsByCedula(cleanCedula).catch(() => null)
          if (currentDiner) {
            emitEvent('biometric:enrolled', {
              dinerId: currentDiner.id,
              cedula: cleanCedula,
              sourceDeviceId: device.diningRoomId
            })
          }
        }
      })
      .catch((err) => {
        console.error(`❌ [Hikvision Auto-Sync] Error procesando nuevo enrolamiento para ${cleanCedula}:`, err?.message || err)
      })
      .finally(() => {
        // Liberar el flag tras 30 segundos
        setTimeout(() => syncingDiners.delete(cleanCedula), 30000)
      })
  }

  // 6. Auto-actualizar el nombre en el terminal físico si fue enrolado sin nombre
  if (diner && (!acs.name || acs.name.trim() === '' || acs.name === 'Sin Nombre')) {
    executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/SetUp?format=json', 'PUT', JSON.stringify({
      UserInfo: {
        employeeNo: cleanCedula,
        name: diner.name.slice(0, 32).toUpperCase().trim(),
        userType: 'normal',
        Valid: {
          enable: true,
          beginTime: '2026-01-01T00:00:00',
          endTime: '2031-12-31T23:59:59',
          timeType: 'local'
        },
        doorRight: '1',
        RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
      }
    })).catch(() => {})
  }

  const eventPayload: BiometricDetectionEvent = {
    diningRoomId: device.diningRoomId,
    diningRoomName: device.diningRoomName,
    cedula: cleanCedula,
    name: resolvedName,
    verifyMode: mapVerifyMode(acs.currentVerifyMode),
    detectedAt: new Date(),
    rawDateTime: eventTime
  }

  console.log(`🔔 [Hikvision Event] Rostro detectado: Cédula ${cleanCedula} (${eventPayload.name}) en ${device.diningRoomName}`)

  // Emitir al EventBus central de Nuxt/SIAC
  emitEvent('biometric:identified', {
    diningRoomId: eventPayload.diningRoomId,
    diningRoomName: eventPayload.diningRoomName,
    cedula: eventPayload.cedula,
    name: eventPayload.name,
    verifyMode: eventPayload.verifyMode,
    detectedAt: eventPayload.detectedAt.toISOString()
  })

  if (onEvent) {
    onEvent(eventPayload)
  }
}

/**
 * Inicia el stream de escucha persistente para un comedor específico con auto-reconexión.
 */
export function startAlertStreamForDiningRoom(
  device: HikvisionDeviceConfig,
  onEvent?: (event: BiometricDetectionEvent) => void
) {
  const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
  const fullUrl = new URL('/ISAPI/Event/notification/alertStream', baseUrl)
  const isHttps = fullUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined

  console.log(`🔌 [Hikvision ISAPI] Conectando escucha alertStream para: ${device.diningRoomName} (${device.ip})...`)

  const req = requestModule.request(fullUrl, {
    method: 'GET',
    agent,
    headers: { 'Accept': '*/*' }
  }, (res) => {
    if (res.statusCode === 401 && res.headers['www-authenticate']) {
      const challenge = parseDigestHeader(res.headers['www-authenticate'])
      const digestAuth = buildDigestAuthHeader(
        'GET',
        fullUrl.pathname + fullUrl.search,
        challenge,
        device.user || 'admin',
        device.password || ''
      )

      const streamReq = requestModule.request(fullUrl, {
        method: 'GET',
        agent,
        headers: {
          'Authorization': digestAuth,
          'Accept': '*/*'
        }
      }, (streamRes) => {
        if (streamRes.statusCode === 200) {
          console.log(`🟢 [Hikvision ISAPI] Stream activo en vivo para comedor: ${device.diningRoomName}`)

          let buffer = ''
          streamRes.on('data', (chunk) => {
            buffer += chunk.toString('utf8')

            // Buscar bloques JSON completos dentro del stream
            const jsonMatches = buffer.match(/\{[\s\S]*?\}(?=\r?\n--|\r?\n$|$)/g)
            if (jsonMatches) {
              for (const jsonStr of jsonMatches) {
                try {
                  const data = JSON.parse(jsonStr)
                  const acs = data.AccessControllerEvent

                  if (acs && acs.employeeNoString) {
                    handleDetectedAccessEvent(device, data, acs, onEvent).catch(() => {})
                  }
                } catch {
                  // Bloque JSON parcial, se completará en el siguiente chunk
                }
              }
            }

            // Consumir el buffer: mantener solo los últimos bytes no terminados para evitar acumulación
            if (buffer.length > 8192) {
              const lastBoundary = buffer.lastIndexOf('--')
              if (lastBoundary !== -1) {
                buffer = buffer.slice(lastBoundary)
              } else {
                buffer = buffer.slice(-1024)
              }
            }
          })

          streamRes.on('end', () => {
            console.log(`⚠️ [Hikvision ISAPI] Stream cerrado para ${device.diningRoomName}. Reconectando en 5s...`)
            setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000)
          })
        }
      })

      streamReq.on('error', (e) => {
        console.error(`❌ [Hikvision ISAPI] Error de stream en ${device.diningRoomName}:`, e.message)
        setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000)
      })

      streamReq.end()
    }
  })

  req.on('error', (err) => {
    console.error(`❌ [Hikvision ISAPI] Error de conexión inicial con ${device.diningRoomName}:`, err.message)
    setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000)
  })

  req.end()
}
