/**
 * SUB-SERVICIO: Conexión HTTP/HTTPS ISAPI alertStream de Bajo Nivel
 * 
 * RESPONSABILIDAD:
 * - Manejo de sockets HTTP/HTTPS persistentes.
 * - Activación de TCP KeepAlive en el socket subyacente.
 * - Digest Auth utilizando el reto www-authenticate retornado por el servidor.
 * - Notificación unificada de cierre/error a través del callback onClose.
 */

import https from 'https'
import http from 'http'
import { URL } from 'url'
import {
  HikvisionDeviceConfig,
  buildDeviceBaseUrl
} from '../../domain/biometrics'
import { fetchDeviceChallenge, buildDigestAuthHeader } from './client'
import { extractJsonObjectsFromBuffer, handleDetectedAccessEvent } from './stream'

// Agent global persistente para reutilizar sockets HTTPS sin reconstruir
const sharedHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 50
})

const sharedHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50
})

export interface StreamConnectionCallbacks {
  onData: (objects: any[]) => void
  onClose: (reason: string) => void
}

export function openAlertStreamConnection(
  device: HikvisionDeviceConfig,
  callbacks: StreamConnectionCallbacks
): { close: () => void } {
  let isClosed = false
  let activeReq: http.ClientRequest | null = null
  let activeRes: http.IncomingMessage | null = null

  const safeClose = (reason: string) => {
    if (isClosed) return
    isClosed = true
    if (activeRes) {
      activeRes.removeAllListeners()
      activeRes.destroy()
    }
    if (activeReq) {
      activeReq.removeAllListeners()
      activeReq.destroy()
    }
    callbacks.onClose(reason)
  }

  const startStream = async () => {
    try {
      const challenge = await fetchDeviceChallenge(device).catch(() => null)
      if (isClosed) return

      const baseUrl = buildDeviceBaseUrl(device.ip, device.port)
      const fullUrl = new URL('/ISAPI/Event/notification/alertStream', baseUrl)
      const isHttps = fullUrl.protocol === 'https:'
      const requestModule = isHttps ? https : http
      const agent = isHttps ? sharedHttpsAgent : sharedHttpAgent

      const digestAuth = buildDigestAuthHeader(
        'GET',
        '/ISAPI/Event/notification/alertStream',
        challenge || { realm: '', nonce: '' },
        device.user || 'admin',
        device.password || ''
      )

      const req = requestModule.request(
        fullUrl,
        {
          method: 'GET',
          agent,
          headers: {
            'Authorization': digestAuth,
            'Accept': '*/*'
          },
          timeout: 0 // Desactivado para flujos de eventos multipart persistentes 24/7
        },
        (res) => {
          activeRes = res

          if (res.statusCode !== 200) {
            res.resume()
            safeClose(`Respuesta HTTP no válida: ${res.statusCode}`)
            return
          }

          // Habilitar TCP KeepAlive en el socket subyacente
          if (res.socket) {
            res.socket.setKeepAlive(true, 10000)
          }

          let buffer = ''
          res.on('data', (chunk: Buffer) => {
            if (isClosed) return
            buffer += chunk.toString('utf8')
            const { objects, remaining } = extractJsonObjectsFromBuffer(buffer)
            buffer = remaining
            if (objects.length > 0) {
              callbacks.onData(objects)
            }
          })

          res.on('end', () => safeClose('Stream finalizado por el dispositivo (end)'))
          res.on('close', () => safeClose('Conexión cerrada por el dispositivo (close)'))
          res.on('error', (err) => safeClose(`Error en socket de lectura: ${err.message}`))
        }
      )

      activeReq = req

      req.on('timeout', () => {
        req.destroy()
        safeClose('Timeout de conexión en solicitud alertStream')
      })

      req.on('error', (err) => {
        safeClose(`Error en solicitud HTTP: ${err.message}`)
      })

      req.end()
    } catch (err: any) {
      safeClose(`Excepción en conexión: ${err?.message || err}`)
    }
  }

  startStream()

  return {
    close: () => safeClose('Cierre manual solicitado por el usuario/supervisor')
  }
}
