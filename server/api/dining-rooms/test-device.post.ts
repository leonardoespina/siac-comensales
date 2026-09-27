import { defineApiHandler } from '../../utils/handler'
import { requireAnyPermission } from '../../utils/auth'
import { DomainError } from '../../domain/errors'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { URL } from 'url'

function parseDigestHeader(header: string): Record<string, string> {
  const challenge: Record<string, string> = {}
  const matches = header.replace(/^Digest\s+/, '').matchAll(/(\w+)="?([^",]+)"?/g)
  for (const match of matches) {
    challenge[match[1]] = match[2]
  }
  return challenge
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

function buildDigestAuthHeader(
  method: string,
  uri: string,
  challenge: Record<string, string>,
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

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

export default defineApiHandler(async (event) => {
  await requireAnyPermission(event, ['DINING_ROOMS', 'DINERS'], 'read')

  const body = await readBody(event)
  const ip = body.deviceIp?.trim()
  const port = Number(body.devicePort) || 443
  const user = body.deviceUser?.trim() || 'admin'
  const password = body.devicePassword || ''

  if (!ip) {
    throw new DomainError('Debe ingresar la dirección IP del terminal', 'VALIDATION_ERROR', 400)
  }

  const isHttps = port === 443 || port === 8443
  const protocol = isHttps ? 'https:' : 'http:'
  const baseUrl = `${protocol}//${ip}:${port}`
  const fullUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      method: 'GET',
      agent,
      timeout: 5000,
      headers: { 'Accept': '*/*' }
    }

    const req = requestModule.request(fullUrl, options, (res) => {
      if (res.statusCode === 401 && res.headers['www-authenticate']) {
        const challenge = parseDigestHeader(res.headers['www-authenticate'])
        const digestAuth = buildDigestAuthHeader(
          'GET',
          fullUrl.pathname,
          challenge,
          user,
          password
        )

        const authReq = requestModule.request(fullUrl, {
          method: 'GET',
          agent,
          timeout: 5000,
          headers: {
            'Authorization': digestAuth,
            'Accept': '*/*'
          }
        }, (authRes) => {
          let data = ''
          authRes.on('data', c => data += c)
          authRes.on('end', () => {
            if (authRes.statusCode === 200) {
              resolve({
                success: true,
                message: 'Conexión y autenticación exitosa con el terminal',
                device: {
                  model: extractTag(data, 'model') || 'Hikvision Terminal',
                  serialNumber: extractTag(data, 'serialNumber') || 'N/A',
                  firmware: extractTag(data, 'firmwareVersion') || 'N/A',
                  mac: extractTag(data, 'macAddress') || 'N/A'
                }
              })
            } else {
              reject(new DomainError(`Fallo de autenticación en el terminal (HTTP ${authRes.statusCode}). Verifique usuario y contraseña.`, 'DEVICE_AUTH_ERROR', 400))
            }
          })
        })

        authReq.on('error', (err) => {
          reject(new DomainError(`Error de comunicación: ${err.message}`, 'DEVICE_TIMEOUT', 504))
        })
        authReq.end()
      } else if (res.statusCode === 200) {
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          resolve({
            success: true,
            message: 'Conexión directa exitosa',
            device: {
              model: extractTag(data, 'model') || 'Hikvision Terminal',
              serialNumber: extractTag(data, 'serialNumber') || 'N/A',
              firmware: extractTag(data, 'firmwareVersion') || 'N/A',
              mac: extractTag(data, 'macAddress') || 'N/A'
            }
          })
        })
      } else {
        reject(new DomainError(`Respuesta inesperada del dispositivo (HTTP ${res.statusCode})`, 'DEVICE_ERROR', 400))
      }
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new DomainError(`Tiempo de espera agotado al intentar conectar con ${ip}:${port}`, 'DEVICE_TIMEOUT', 504))
    })

    req.on('error', (err) => {
      reject(new DomainError(`No se pudo alcanzar el terminal en ${ip}:${port} (${err.message})`, 'DEVICE_UNREACHABLE', 502))
    })

    req.end()
  })
})
