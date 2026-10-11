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

async function executeIsapiRequest(
  config: TerminalConfig,
  endpoint: string,
  method = 'GET',
  bodyData?: string
): Promise<{ statusCode: number; data: string }> {
  const baseUrl = `https://${config.ip}:${config.port || 443}`
  const challengeUrl = new URL('/ISAPI/System/deviceInfo', baseUrl)
  const targetUrl = new URL(endpoint, baseUrl)
  const isHttps = targetUrl.protocol === 'https:'
  const requestModule = isHttps ? https : http
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false, keepAlive: true }) : undefined

  // 1. Obtener challenge
  const challenge = await new Promise<Record<string, string>>((resolve, reject) => {
    const req = requestModule.request(challengeUrl, { method: 'GET', agent, timeout: 4000 }, (res) => {
      const authHeader = res.headers['www-authenticate']
      if (authHeader) resolve(parseDigestHeader(authHeader))
      else reject(new Error(`Respuesta sin reto Digest [HTTP ${res.statusCode}]`))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout de reto')) })
    req.end()
  })

  // 2. Ejecutar petición con auth
  const authHeader = buildDigestHeader(method, targetUrl.pathname + targetUrl.search, challenge, config.user, config.password)
  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Accept': '*/*'
  }
  if (bodyData) {
    headers['Content-Type'] = 'application/json'
    headers['Content-Length'] = Buffer.byteLength(bodyData).toString()
  }

  return new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
    const req = requestModule.request(targetUrl, { method, agent, headers, timeout: 5000 }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout petición ISAPI')) })
    if (bodyData) req.write(bodyData)
    req.end()
  })
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
      // 1. Obtener el serial actual más alto
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
            minor: 0
          }
        })
      )
      const initData = JSON.parse(initRes.data)
      lastSeenSerial = initData.AcsEvent?.totalMatches || 0
      console.log(`🟢 [EdgeBiometric] Terminal en línea. Inicializado en evento serial #${lastSeenSerial}.`)
    } catch (e: any) {
      console.warn(`⚠️ [EdgeBiometric] Error al inicializar AcsEvent (${e.message}). Reintentando en 3s...`)
      if (!isClosed) setTimeout(startAcsPolling, 3000)
      return
    }

    // 2. Loop de lectura ultra-rápida (cada 600 ms en LAN local = 0 ms WAN)
    const pollLoop = async () => {
      if (isClosed) return
      try {
        const queryOffset = Math.max(0, lastSeenSerial - 2)
        const res = await executeIsapiRequest(
          config,
          '/ISAPI/AccessControl/AcsEvent?format=json',
          'POST',
          JSON.stringify({
            AcsEventCond: {
              searchID: `edge_${Date.now()}`,
              searchResultPosition: queryOffset,
              maxResults: 10,
              major: 0,
              minor: 0
            }
          })
        )

        if (res.statusCode === 200 && res.data.trim().startsWith('{')) {
          const parsed = JSON.parse(res.data)
          const list = parsed.AcsEvent?.InfoList || []
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
