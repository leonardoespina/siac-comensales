/**
 * EDGE BIOMETRIC: Conexión ISAPI alertStream Local con Terminal Hikvision
 * 
 * Conexión persistente multipart HTTP/HTTPS en la red interna de la sede (0 ms).
 * Autenticación Digest RFC 2617 sin dependencias externas pesadas.
 */

import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { URL } from 'url'

export interface TerminalConfig {
  ip: string
  port: number
  user: string
  password: string
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

function parseDigestHeader(header: string): Record<string, string> {
  const challenge: Record<string, string> = {}
  const matches = header.replace(/^Digest\s+/, '').matchAll(/(\w+)="?([^",]+)"?/g)
  for (const match of matches) {
    challenge[match[1]] = match[2]
  }
  return challenge
}

function buildDigestHeader(
  method: string,
  uri: string,
  challenge: Record<string, string>,
  user: string,
  pass: string
): string {
  const ha1 = md5(`${user}:${challenge.realm}:${pass}`)
  const ha2 = md5(`${method}:${uri}`)

  if (challenge.qop && challenge.qop.includes('auth')) {
    const nc = '00000001'
    const cnonce = crypto.randomBytes(8).toString('hex')
    const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`)
    let header = `Digest username="${user}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}", qop=auth, nc=${nc}, cnonce="${cnonce}"`
    if (challenge.opaque) header += `, opaque="${challenge.opaque}"`
    return header
  } else {
    const response = md5(`${ha1}:${challenge.nonce}:${ha2}`)
    let header = `Digest username="${user}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}"`
    if (challenge.opaque) header += `, opaque="${challenge.opaque}"`
    return header
  }
}

// Agentes HTTP/HTTPS persistentes para reutilizar sockets sin renegociar TLS
const sharedHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 20
})

const sharedHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 20
})

// Caché de retos criptográficos por IP para no pedir reto en cada ciclo
const challengeCache = new Map<string, Record<string, string>>()

async function fetchChallenge(config: TerminalConfig): Promise<Record<string, string>> {
  const baseUrl = `https://${config.ip}:${config.port || 443}`
  const challengeUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
  const isHttps = challengeUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? sharedHttpsAgent : sharedHttpAgent

  return new Promise((resolve, reject) => {
    const req = requestModule.request(challengeUrl, { method: 'GET', agent, timeout: 3000 }, (res) => {
      const authHeader = res.headers['www-authenticate']
      if (authHeader) {
        const chal = parseDigestHeader(authHeader)
        challengeCache.set(config.ip, chal)
        resolve(chal)
      } else {
        reject(new Error(`Respuesta sin reto Digest [HTTP ${res.statusCode}]`))
      }
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout de reto')) })
    req.end()
  })
}

export async function executeIsapiRawRequest(
  config: TerminalConfig,
  endpoint: string,
  method = 'GET',
  bodyData?: string | Buffer,
  contentType = 'application/json',
  timeoutMs = 8000
): Promise<{ statusCode: number; data: string; buffer: Buffer }> {
  let challenge = challengeCache.get(config.ip)
  if (!challenge) {
    challenge = await fetchChallenge(config)
  }

  const baseUrl = `https://${config.ip}:${config.port || 443}`
  const targetUrl = new URL(endpoint, baseUrl)
  const isHttps = targetUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? sharedHttpsAgent : sharedHttpAgent

  const sendWithChallenge = (chal: Record<string, string>): Promise<{ statusCode: number; data: string; buffer: Buffer }> => {
    return new Promise((resolve, reject) => {
      const authHeader = buildDigestHeader(method, targetUrl.pathname + targetUrl.search, chal, config.user, config.password)
      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Accept': '*/*'
      }
      if (bodyData) {
        headers['Content-Type'] = contentType
        const len = Buffer.isBuffer(bodyData) ? bodyData.length : Buffer.byteLength(bodyData)
        headers['Content-Length'] = len.toString()
      }

      const req = requestModule.request(targetUrl, { method, agent, headers, timeout: timeoutMs }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          const data = buffer.toString('utf8')
          resolve({ statusCode: res.statusCode || 500, data, buffer })
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout petición ISAPI')) })
      if (bodyData) req.write(bodyData)
      req.end()
    })
  }

  let res = await sendWithChallenge(challenge)

  // Si el terminal expira el nonce (HTTP 401), renovar reto y reintentar inmediatamente una vez
  if (res.statusCode === 401) {
    challenge = await fetchChallenge(config)
    res = await sendWithChallenge(challenge)
  }

  return res
}

async function executeIsapiRequest(
  config: TerminalConfig,
  endpoint: string,
  method = 'GET',
  bodyData?: string
): Promise<{ statusCode: number; data: string }> {
  const raw = await executeIsapiRawRequest(config, endpoint, method, bodyData, 'application/json', 4000)
  return { statusCode: raw.statusCode, data: raw.data }
}

export async function executeInteractiveFaceCapture(
  config: TerminalConfig,
  timeoutMs = 30000
): Promise<Buffer> {
  const payload = `<CaptureFaceDataCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><captureInfrared>false</captureInfrared><dataType>binary</dataType></CaptureFaceDataCond>`

  const capRes = await executeIsapiRawRequest(
    config,
    '/ISAPI/AccessControl/CaptureFaceData',
    'POST',
    payload,
    'application/xml',
    timeoutMs
  )

  let photoBuffer: Buffer | null = null

  if (capRes.statusCode === 200 && capRes.buffer.length > 500) {
    if (capRes.buffer[0] === 0xFF && capRes.buffer[1] === 0xD8) {
      photoBuffer = capRes.buffer
    } else {
      const startIdx = capRes.buffer.indexOf(Buffer.from([0xFF, 0xD8]))
      const endIdx = capRes.buffer.lastIndexOf(Buffer.from([0xFF, 0xD9]))
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        photoBuffer = capRes.buffer.subarray(startIdx, endIdx + 2)
      }
    }
  }

  if (!photoBuffer) {
    throw new Error(`No se completó la captura interactiva en el terminal [HTTP ${capRes.statusCode}]`)
  }

  return photoBuffer
}

export async function getTerminalUserName(config: TerminalConfig, cleanCedula: string): Promise<string | null> {
  try {
    const searchBody = JSON.stringify({
      UserInfoSearchCond: {
        searchID: `name_search_${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 1,
        EmployeeNoList: [{ employeeNo: cleanCedula }]
      }
    })
    const res = await executeIsapiRawRequest(
      config,
      '/ISAPI/AccessControl/UserInfo/Search?format=json',
      'POST',
      searchBody,
      'application/json; charset=UTF-8',
      4000
    )
    if (res.statusCode === 200 && res.data) {
      const parsed = JSON.parse(res.data)
      const u = parsed.UserInfoSearch?.UserInfo?.[0]
      if (u?.name && u.name.trim() && u.name.trim() !== cleanCedula) {
        return u.name.trim()
      }
    }
  } catch {}
  return null
}

export async function pushUserAndFaceLocal(
  config: TerminalConfig,
  cedula: string,
  name: string,
  photoBuffer: Buffer
): Promise<{ userSuccess: boolean; faceSuccess: boolean; error?: string }> {
  const cleanCedula = cedula.trim().replace(/\D/g, '')
  if (!cleanCedula) {
    return { userSuccess: false, faceSuccess: false, error: 'Cédula inválida' }
  }

  // Resolver nombre: si viene vacío o igual a la cédula, preservar el que ya tenga el biométrico
  let resolvedName = name ? name.trim() : ''
  if (!resolvedName || resolvedName === cleanCedula) {
    const existingName = await getTerminalUserName(config, cleanCedula)
    if (existingName) {
      resolvedName = existingName
    }
  }
  if (!resolvedName) {
    resolvedName = cleanCedula
  }

  // 1. UserInfo SetUp
  const setupBody = JSON.stringify({
    UserInfo: {
      employeeNo: cleanCedula,
      name: resolvedName.slice(0, 32).toUpperCase().trim(),
      userType: 'normal',
      closeDelay: 0,
      Valid: {
        enable: true,
        beginTime: '2026-01-01T00:00:00',
        endTime: '2035-12-31T23:59:59',
        timeType: 'local'
      },
      doorRight: '1',
      RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
    }
  })

  const userRes = await executeIsapiRawRequest(
    config,
    '/ISAPI/AccessControl/UserInfo/SetUp?format=json',
    'PUT',
    setupBody,
    'application/json; charset=UTF-8',
    6000
  )

  const userSuccess = userRes.statusCode === 200
  if (!userSuccess) {
    return { userSuccess: false, faceSuccess: false, error: `Error configurando usuario en terminal [HTTP ${userRes.statusCode}]` }
  }

  // 2. Inyectar foto facial en FDLib
  let faceSuccess = false
  if (photoBuffer && photoBuffer.length > 500) {
    const boundary = '----HikvisionEdgeSyncBoundary'
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
    const multipartBody = Buffer.concat([headBuf, photoBuffer, tailBuf])

    const faceRes = await executeIsapiRawRequest(
      config,
      '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json',
      'POST',
      multipartBody,
      `multipart/form-data; boundary=${boundary}`,
      15000
    )

    faceSuccess = faceRes.statusCode === 200
  }

  return { userSuccess, faceSuccess }
}


export function startLocalBiometricStream(
  config: TerminalConfig,
  onDeteccion: (cedula: string, rawEvent: any) => void,
  pollIntervalMs = 180
) {
  let isClosed = false
  let pollTimer: NodeJS.Timeout | null = null
  const baseUrl = `https://${config.ip}:${config.port || 443}`
  const isHttps = baseUrl.startsWith('https')
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false, keepAlive: true }) : undefined

  console.log(`🔌 [EdgeBiometric] Conectando con biométrico en ${config.ip}:${config.port}...`)

  // Modo Sondeo Local Rápido de AcsEvents (para MinMoe y terminales con alertStream deprecado)
  const startAcsPolling = async () => {
    if (isClosed) return
    console.log(`⚡ [EdgeBiometric] Activando modo MinMoe AcsEvent (Lectura local de eventos en LAN)...`)

    let lastSeenSerial = 0
    try {
      // 1. Obtener el serial actual más alto (lectura instantánea de tope de cola)
      const initRes = await executeIsapiRequest(
        config,
        '/ISAPI/AccessControl/AcsEvent?format=json',
        'POST',
        JSON.stringify({
          AcsEventCond: {
            searchID: `edge_init_${Date.now()}`,
            searchResultPosition: 0,
            maxResults: 1,
            major: 0,
            minor: 0,
            timeReverseOrder: true
          }
        })
      )
      const initData = JSON.parse(initRes.data)
      const firstEv = initData.AcsEvent?.InfoList?.[0]
      lastSeenSerial = firstEv?.serialNo || initData.AcsEvent?.totalMatches || 0
      console.log(`🟢 [EdgeBiometric] Terminal en línea. Inicializado en evento serial #${lastSeenSerial}.`)
    } catch (e: any) {
      console.warn(`⚠️ [EdgeBiometric] Error al inicializar AcsEvent (${e.message}). Reintentando en 3s...`)
      if (!isClosed) setTimeout(startAcsPolling, 3000)
      return
    }

    // 2. Loop de lectura ultra-rápida (Tope de cola en orden inverso con ventana temporal de 60s)
    const pad = (n: number) => String(n).padStart(2, '0')
    const pollLoop = async () => {
      if (isClosed) return
      try {
        const now = new Date(Date.now() - 60000)
        const startTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}-04:00`

        const res = await executeIsapiRequest(
          config,
          '/ISAPI/AccessControl/AcsEvent?format=json',
          'POST',
          JSON.stringify({
            AcsEventCond: {
              searchID: `edge_${Date.now()}`,
              searchResultPosition: 0,
              maxResults: 5,
              major: 0,
              minor: 0,
              startTime,
              timeReverseOrder: true
            }
          })
        )

        if (res.statusCode === 200 && res.data.trim().startsWith('{')) {
          const parsed = JSON.parse(res.data)
          // Ordenar cronológicamente (más antiguo al más reciente) para no saltarse eventos
          const list = (parsed.AcsEvent?.InfoList || []).slice().reverse()
          for (const ev of list) {
            if (ev.serialNo > lastSeenSerial) {
              lastSeenSerial = Math.max(lastSeenSerial, ev.serialNo)
              const rawId = ev.employeeNoString || (ev.employeeNo ? String(ev.employeeNo) : '') || ev.cardNo || ''
              // Si el evento tiene identificación asociada (rostro verificado o marcación)
              if (rawId && (ev.minor === 75 || ev.minor === 38 || ev.minor === 1 || ev.name)) {
                console.log(`🎯 [EdgeBiometric] Rostro detectado: Cédula ${rawId} (${ev.name || 'Sin nombre'}) [Serial #${ev.serialNo}]`)
                onDeteccion(rawId, ev)
              }
            }
          }
        }
      } catch (err: any) {
        // En caso de caída transitoria de red, no romper el loop
      }

      if (!isClosed) {
        pollTimer = setTimeout(pollLoop, pollIntervalMs)
      }
    }

    pollLoop()
  }

  const connect = async () => {
    if (isClosed) return

    const challengeUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
    const streamUrl = new URL('/ISAPI/Event/notification/alertStream', baseUrl)

    // 1. Obtener reto Digest
    let challenge: Record<string, string> | null = null
    try {
      challenge = await new Promise<Record<string, string>>((resolve, reject) => {
        const req = requestModule.request(challengeUrl, { method: 'GET', agent, timeout: 4000 }, (res) => {
          const authHeader = res.headers['www-authenticate']
          if (authHeader) resolve(parseDigestHeader(authHeader))
          else reject(new Error(`Respuesta sin reto Digest [HTTP ${res.statusCode}]`))
        })
        req.on('error', reject)
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout de reto')) })
        req.end()
      })
    } catch (err: any) {
      console.warn(`⚠️ [EdgeBiometric] Error al retar biométrico (${config.ip}): ${err.message}. Reintentando en 5s...`)
      setTimeout(connect, 5000)
      return
    }

    // 2. Intentar alertStream
    const authHeader = buildDigestHeader('GET', streamUrl.pathname, challenge, config.user, config.password)
    const streamReq = requestModule.request(streamUrl, {
      method: 'GET',
      agent,
      headers: { 'Authorization': authHeader, 'Accept': '*/*' },
      timeout: 0
    }, (streamRes) => {
      // Si el terminal devuelve 404, es un MinMoe con alertStream desactivado -> Conmutar a AcsEvent
      if (streamRes.statusCode === 404) {
        console.log(`ℹ️ [EdgeBiometric] alertStream no soportado por este firmware (HTTP 404). Conmutando a modo MinMoe AcsEvent...`)
        streamRes.resume()
        startAcsPolling()
        return
      }

      if (streamRes.statusCode !== 200) {
        console.warn(`⚠️ [EdgeBiometric] Terminal rechazó stream [HTTP ${streamRes.statusCode}]. Reintentando en 5s...`)
        streamRes.resume()
        setTimeout(connect, 5000)
        return
      }

      console.log(`🟢 [EdgeBiometric] Stream multipart local CONECTADO con éxito (0 ms) a ${config.ip}`)

      let buffer = ''
      streamRes.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
        let startIndex = -1
        let depth = 0
        let inString = false
        let isEscaped = false
        let lastEnd = 0

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i]
          if (inString) {
            if (isEscaped) isEscaped = false
            else if (char === '\\') isEscaped = true
            else if (char === '"') inString = false
            continue
          }
          if (char === '"') { inString = true; continue }
          if (char === '{') {
            if (depth === 0) startIndex = i
            depth++
          } else if (char === '}') {
            depth--
            if (depth === 0 && startIndex !== -1) {
              try {
                const parsed = JSON.parse(buffer.slice(startIndex, i + 1))
                lastEnd = i + 1
                const acs = parsed?.AccessControllerEvent
                if (acs) {
                  const rawId = acs.employeeNoString || (acs.employeeNo ? String(acs.employeeNo) : '') || acs.cardNo || ''
                  if (rawId) onDeteccion(rawId, acs)
                }
              } catch {}
              startIndex = -1
            }
          }
        }
        buffer = lastEnd > 0 ? buffer.slice(lastEnd) : buffer
      })

      streamRes.on('end', () => {
        console.warn('⚠️ [EdgeBiometric] Stream local finalizado por el dispositivo. Reconectando en 3s...')
        setTimeout(connect, 3000)
      })
      streamRes.on('error', (err) => {
        console.warn(`⚠️ [EdgeBiometric] Error en stream local: ${err.message}. Reconectando en 3s...`)
        setTimeout(connect, 3000)
      })
    })

    streamReq.on('error', (err) => {
      console.warn(`⚠️ [EdgeBiometric] Error de red en socket local: ${err.message}. Conmutando a AcsEvent...`)
      startAcsPolling()
    })
    streamReq.end()
  }

  connect()

  return {
    close: () => {
      isClosed = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }
}
