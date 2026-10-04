/**
 * SUB-SERVICIO: Diagnóstico y Salud de Terminales Hikvision
 * 
 * RESPONSABILIDAD:
 * - Verificación de latencia y estado online/offline de terminales en red.
 */

import https from 'https'
import http from 'http'
import { URL } from 'url'
import { HikvisionDeviceConfig, buildDeviceBaseUrl } from '../../domain/biometrics'

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
      res.resume()
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
