/**
 * SUB-SERVICIO: Streaming Persistente de Alertas y Eventos ISAPI
 * 
 * RESPONSABILIDAD:
 * - Conexión persistente multipart/mixed (/ISAPI/Event/notification/alertStream).
 * - Parser robusto de objetos JSON anidados en chunks multipart.
 * - Anti-rebote de detecciones en memoria y emisión de biometric:identified.
 */

import https from 'https'
import http from 'http'
import { URL } from 'url'
import {
  HikvisionDeviceConfig,
  BiometricDetectionEvent,
  sanitizeEmployeeNo,
  mapVerifyMode,
  buildDeviceBaseUrl
} from '../../domain/biometrics'
import { fetchDeviceChallenge, buildDigestAuthHeader } from './client'
import { fetchAndStoreFaceFromDevice } from './face'
import * as biometricRepo from '../../repository/biometricRepository'
import { emitEvent } from '../../utils/eventBus'

// Anti-rebote en memoria (4 segundos por comensal)
const recentDetections = new Map<string, number>()
const DEBOUNCE_MS = 4000

export function extractJsonObjectsFromBuffer(buffer: string): { objects: any[]; remaining: string } {
  const objects: any[] = []
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
          objects.push(parsed)
          lastEnd = i + 1
        } catch { /* ignorar fragmentos inválidos */ }
        startIndex = -1
      }
    }
  }
  const remaining = lastEnd > 0 ? buffer.slice(lastEnd) : (depth > 0 && startIndex !== -1 ? buffer.slice(startIndex) : '')
  return { objects, remaining }
}

export async function handleDetectedAccessEvent(
  device: HikvisionDeviceConfig,
  eventData: any,
  acs: any,
  onEvent?: (event: BiometricDetectionEvent) => void
) {
  const rawId = acs.employeeNoString || (acs.employeeNo ? String(acs.employeeNo) : '') || acs.cardNo || ''
  const cleanCedula = sanitizeEmployeeNo(rawId)
  if (!cleanCedula) return

  const now = Date.now()
  if (now - (recentDetections.get(cleanCedula) || 0) < DEBOUNCE_MS) return
  recentDetections.set(cleanCedula, now)

  const verifyMode = mapVerifyMode(acs.currentVerifyMode || acs.verifyMode)
  const rawDateTime = eventData.dateTime || new Date().toISOString()
  const detectedAt = new Date(rawDateTime)

  const detectionEvent: BiometricDetectionEvent = {
    diningRoomId: device.diningRoomId,
    diningRoomName: device.diningRoomName,
    cedula: cleanCedula,
    name: acs.name || cleanCedula,
    verifyMode,
    detectedAt,
    rawDateTime
  }

  if (verifyMode === 'face') {
    fetchAndStoreFaceFromDevice(device, cleanCedula).catch(() => {})
  }

  // Emisión tipada al EventBus para Socket.io y listeners
  emitEvent('biometric:identified', {
    diningRoomId: device.diningRoomId,
    diningRoomName: device.diningRoomName,
    cedula: cleanCedula,
    name: acs.name || cleanCedula,
    verifyMode,
    detectedAt: rawDateTime
  })

  if (onEvent) {
    try { onEvent(detectionEvent) } catch (e: any) {
      console.error(`❌ Callback biométrico para ${cleanCedula}:`, e.message)
    }
  }
}

export async function startAlertStreamForDiningRoom(
  device: HikvisionDeviceConfig,
  onEvent?: (event: BiometricDetectionEvent) => void
): Promise<void> {
  if (!device.enabled || !device.ip) return

  const challenge = await fetchDeviceChallenge(device).catch(() => null)
  const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
  const fullUrl = new URL('/ISAPI/Event/notification/alertStream', baseUrl)
  const isHttps = fullUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined

  const req = requestModule.request(fullUrl, { method: 'GET', agent, timeout: 10000 }, (res) => {
    if (res.statusCode === 401 && res.headers['www-authenticate']) {
      const digestAuth = buildDigestAuthHeader(
        'GET',
        '/ISAPI/Event/notification/alertStream',
        challenge || { realm: '', nonce: '' },
        device.user || 'admin',
        device.password || ''
      )

      const streamReq = requestModule.request(fullUrl, {
        method: 'GET',
        agent,
        headers: { 'Authorization': digestAuth, 'Accept': '*/*' }
      }, (streamRes) => {
        if (streamRes.statusCode === 200) {
          console.log(`🟢 [Hikvision ISAPI] Stream activo para: ${device.diningRoomName}`)
          let buffer = ''
          streamRes.on('data', (chunk) => {
            buffer += chunk.toString('utf8')
            const { objects, remaining } = extractJsonObjectsFromBuffer(buffer)
            buffer = remaining
            for (const data of objects) {
              const acs = data.AccessControllerEvent
              if (acs) {
                handleDetectedAccessEvent(device, data, acs, onEvent).catch(() => {})
              }
            }
          })
          streamRes.on('end', () => setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000))
        }
      })
      streamReq.on('error', () => setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000))
      streamReq.end()
    }
  })
  req.on('error', () => setTimeout(() => startAlertStreamForDiningRoom(device, onEvent), 5000))
  req.end()
}

export async function initHikvisionBiometricStreams(onEvent?: (event: BiometricDetectionEvent) => void): Promise<void> {
  try {
    const activeRooms = await biometricRepo.listActiveBiometricDiningRooms()
    for (const room of activeRooms) {
      if (!room.deviceIp) continue
      startAlertStreamForDiningRoom({
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }, onEvent).catch(() => {})
    }
  } catch (err: any) {
    console.error('❌ [Hikvision Streams] Error al inicializar streams:', err.message)
  }
}
