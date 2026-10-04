/**
 * SUB-SERVICIO: Cliente HTTP ISAPI y Digest Auth RFC 2617
 * 
 * RESPONSABILIDAD:
 * - Manejo de retos criptográficos (Digest Authentication) y ejecución de peticiones HTTP/HTTPS.
 * - Anti-rebote y conexión segura con bypass de certificados autofirmados.
 */

import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { URL } from 'url'
import {
  HikvisionDeviceConfig,
  HikvisionDigestChallenge,
  HikvisionConnectionError,
  HikvisionAuthError,
  buildDeviceBaseUrl
} from '../../domain/biometrics'

// Cache de retos Digest por IP de dispositivo
const challengeCache = new Map<string, HikvisionDigestChallenge>()

export function parseDigestHeader(header: string): HikvisionDigestChallenge {
  const challenge: Record<string, string> = {}
  const matches = header.replace(/^Digest\s+/, '').matchAll(/(\w+)="?([^",]+)"?/g)
  for (const match of matches) {
    challenge[match[1]] = match[2]
  }
  return challenge as unknown as HikvisionDigestChallenge
}

export function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

export function buildDigestAuthHeader(
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

export async function fetchDeviceChallenge(device: HikvisionDeviceConfig): Promise<HikvisionDigestChallenge> {
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

export async function executeIsapiRequest(
  device: HikvisionDeviceConfig,
  endpoint: string,
  method = 'GET',
  bodyData?: string | Buffer,
  contentType = 'application/json; charset=UTF-8',
  timeoutMs = 8000
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

      const req = requestModule.request(fullUrl, { method, agent, headers, timeout: timeoutMs }, (res) => {
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

  if (res.statusCode === 401) {
    challenge = await fetchDeviceChallenge(device)
    res = await sendWithChallenge(challenge)
  }

  return res
}
