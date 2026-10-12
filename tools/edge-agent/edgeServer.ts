/**
 * SERVIDOR PRINCIPAL: SIAC Kiosk Edge Agent (Micro-Servicio Local MSB)
 * 
 * RESPONSABILIDAD:
 * - Descarga dinámica de configuración y padrón diario sin hardcodear IPs.
 * - Conexión ISAPI local con biométrico en 0 ms.
 * - Validación instantánea en memoria RAM (10 microsegundos).
 * - Notificación en tiempo real a la pantalla de despacho vía WebSocket local.
 * - Sincronización asíncrona tolerante a fallos de red contra el servidor central.
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'
import { edgeStore } from './edgeStore'
import { startLocalBiometricStream, TerminalConfig, executeInteractiveFaceCapture, pushUserAndFaceLocal } from './edgeBiometric'

const agentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// Cargar configuración
const CONFIG_PATH = path.join(agentDir, 'config.json')
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const LOCAL_DEV_URL = config.localDevUrl || 'http://localhost:3000'
const CENTRAL_URL = config.centralServerUrl || 'http://10.60.0.21:8080'
const TUNNEL_URL = config.tunnelServerUrl || 'https://comensales.lespina.info'
const DINING_ROOM_ID = config.diningRoomId || 2
const PORT = config.edgePort || 3005
const REFRESH_INTERVAL_MIN = config.refreshIntervalMinutes || 5
const POLL_INTERVAL_MS = config.pollIntervalMs || 180

let activeTerminalConfig: TerminalConfig | null = null
const connectedWsClients = new Set<WebSocket>()

// Helper para peticiones HTTP hacia el servidor central con fallback ordenado
async function fetchFromCentral(endpoint: string, options: any = {}): Promise<any> {
  const urls = [LOCAL_DEV_URL, CENTRAL_URL, TUNNEL_URL].filter(Boolean)
  let lastError: any = null

  for (const base of urls) {
    try {
      const fullUrl = `${base.replace(/\/$/, '')}${endpoint}`
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Servidor ${base} no devolvió JSON (Content-Type: ${contentType})`)
      }
      return await res.json()
    } catch (e: any) {
      lastError = e
    }
  }

  throw lastError || new Error('No fue posible contactar al servidor central')
}

// Descargar padrón diario y configuración dinámica del biométrico
async function refreshDailySheet() {
  console.log(`📡 [EdgeAgent] Descargando padrón del día para Comedor #${DINING_ROOM_ID}...`)
  try {
    const data = await fetchFromCentral(`/api/dispatch/edge/sheet?diningRoomId=${DINING_ROOM_ID}`)
    
    // Cargar comensales en memoria
    edgeStore.populateFromDailySheet(data.diners || [], data.schedules || [])

    // Configuración del biométrico obtenida dinámicamente (SIN HARDCODEO)
    if (data.diningRoom?.deviceIp) {
      activeTerminalConfig = {
        ip: data.diningRoom.deviceIp,
        port: data.diningRoom.devicePort || 443,
        user: data.diningRoom.deviceUser || 'admin',
        password: data.diningRoom.devicePassword || ''
      }
      console.log(`🎯 [EdgeAgent] Configuración de terminal resuelta dinámicamente: ${activeTerminalConfig.ip}:${activeTerminalConfig.port}`)
    } else {
      console.warn('⚠️ [EdgeAgent] El comedor no tiene terminal biométrico configurado en la base de datos.')
    }

    broadcastWs({
      type: 'edge:sheet_updated',
      diningRoom: data.diningRoom?.name,
      totalApproved: data.totalApproved
    })
  } catch (err: any) {
    console.error(`❌ [EdgeAgent] Error descargando padrón del servidor central: ${err.message}. Operando con caché existente.`)
  }
}

// Enviar notificaciones a todas las pantallas locales conectadas
function broadcastWs(payload: any) {
  const msg = JSON.stringify(payload)
  for (const client of connectedWsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

// Procesar detección facial en 0 ms
function handleLocalDetection(cedula: string) {
  const result = edgeStore.validateAndDispatchInstant(cedula)
  if (result.code === 'DEBOUNCE') return // ignorar rebote

  console.log(`⚡ [0 ms] Detección ${cedula}: ${result.code} - ${result.message}`)

  broadcastWs({
    type: 'dispatch:result',
    success: result.success,
    code: result.code,
    message: result.message,
    diner: result.diner
  })
}

// Worker de sincronización asíncrona hacia el servidor central (cada 30s)
async function syncPendingQueueWorker() {
  const queue = edgeStore.getPendingQueue()
  if (queue.length === 0) return

  console.log(`📤 [EdgeSyncWorker] Intentando sincronizar ${queue.length} despachos pendientes con el servidor central...`)
  try {
    const payload = {
      diningRoomId: DINING_ROOM_ID,
      items: queue.map(q => ({
        detailId: q.detailId,
        cedula: q.cedula,
        shiftType: q.shiftType,
        dispatchedAt: q.dispatchedAt
      }))
    }

    const res = await fetchFromCentral('/api/dispatch/edge/batch-sync', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (res?.success) {
      const syncedIds = queue.map(q => q.detailId)
      edgeStore.confirmSyncedBatch(syncedIds)
      console.log(`✅ [EdgeSyncWorker] Sincronización exitosa: ${syncedIds.length} despachos confirmados en base de datos central.`)
    }
  } catch (err: any) {
    console.warn(`⏳ [EdgeSyncWorker] Servidor central no disponible (${err.message}). Los despachos permanecen a salvo en la cola local.`)
  }
}

// Servidor HTTP y WebSocket local
const server = http.createServer((req, res) => {
  // Cabeceras CORS abiertas para permitir peticiones desde la app local
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      mode: 'EDGE_LOCAL',
      diningRoomId: DINING_ROOM_ID,
      terminalIp: activeTerminalConfig?.ip || 'NO_CONFIGURED',
      stats: edgeStore.getStats(),
      timestamp: new Date().toISOString()
    }))
    return
  }

  if (req.url === '/refresh' && req.method === 'POST') {
    refreshDailySheet().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, message: 'Padrón refrescado' }))
    }).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: err.message }))
    })
    return
  }

  // Webhook HTTP Push nativo desde el hardware Hikvision MinMoe (0 ms)
  if (req.url?.startsWith('/hikvision/event') && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        let rawId = ''
        if (body.includes('{')) {
          const s = body.indexOf('{')
          const e = body.lastIndexOf('}')
          if (s !== -1 && e !== -1) {
            const parsed = JSON.parse(body.slice(s, e + 1))
            const acs = parsed?.AccessControllerEvent || parsed?.AcsEvent
            rawId = acs?.employeeNoString || (acs?.employeeNo ? String(acs.employeeNo) : '') || acs?.cardNo || ''
          }
        }
        if (rawId) {
          console.log(`🎯 [EdgePush] Evento empujado por MinMoe (0 ms Webhook): Cédula ${rawId}`)
          handleLocalDetection(rawId)
        }
      } catch (err) {}
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ statusCode: 1, statusString: 'OK' }))
    })
    return
  }

  // Captura interactiva directa en terminal local (Bypass de VPN para enrolamiento remoto)
  if (req.url === '/api/edge/interactive-capture' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const cedula = String(parsed.cedula || '').trim()
        if (!cedula) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Cédula requerida' }))
          return
        }

        if (!activeTerminalConfig) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Terminal biométrico no configurado en este Edge Agent' }))
          return
        }

        console.log(`📸 [EdgeCapture] Activando pantalla física del terminal ${activeTerminalConfig.ip} para cédula ${cedula}...`)
        const photoBuffer = await executeInteractiveFaceCapture(activeTerminalConfig, 30000)
        console.log(`📸 [EdgeCapture] Foto capturada exitosamente (${(photoBuffer.length / 1024).toFixed(1)} KB)`)

        // Enrolar de inmediato en el biométrico local
        const enrollResult = await pushUserAndFaceLocal(
          activeTerminalConfig,
          cedula,
          parsed.name || cedula,
          photoBuffer
        )
        console.log(`👤 [EdgeCapture] Enrolado en hardware local: user=${enrollResult.userSuccess}, face=${enrollResult.faceSuccess}`)

        // Subir al servidor central vía túnel / servidor disponible
        let uploadResult: any = null
        try {
          uploadResult = await fetchFromCentral('/api/biometrics/face/upload', {
            method: 'POST',
            body: JSON.stringify({
              cedula,
              photoBase64: photoBuffer.toString('base64'),
              diningRoomId: DINING_ROOM_ID
            })
          })
          console.log(`☁️ [EdgeCapture] Foto respaldada en servidor central con éxito:`, uploadResult?.photoUrl)
        } catch (uploadErr: any) {
          console.warn(`⚠️ [EdgeCapture] Foto enrolada localmente, sincronización diferida con central: ${uploadErr.message}`)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          photoUrl: uploadResult?.photoUrl || `/api/biometrics/face/${cedula}?t=${Date.now()}`,
          cedula,
          name: parsed.name || cedula,
          enrolledInDevice: enrollResult.faceSuccess
        }))
      } catch (err: any) {
        console.error(`❌ [EdgeCapture] Error en captura interactiva:`, err.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('💻 [EdgeAgent] Pantalla de Despacho conectada al WebSocket local (0 ms).')
  connectedWsClients.add(ws)

  ws.send(JSON.stringify({
    type: 'edge:connected',
    message: '🟢 Conectado a Kiosk Edge Agent (Latencia 0 ms)',
    diningRoomId: DINING_ROOM_ID,
    stats: edgeStore.getStats()
  }))

  ws.on('close', () => connectedWsClients.delete(ws))
})

// Inicialización del sistema
async function bootstrap() {
  console.log(`🚀 ========================================================`)
  console.log(`🚀 SIAC KIOSK EDGE AGENT (Sede Remota - Validación 0 ms)`)
  console.log(`🚀 Puerto Local: ${PORT} | Comedor ID: ${DINING_ROOM_ID}`)
  console.log(`🚀 ========================================================`)

  server.listen(PORT, async () => {
    console.log(`🟢 [EdgeAgent] Servidor local HTTP y WebSocket activo en http://localhost:${PORT}`)

    // 1. Descargar padrón y configuración dinámica
    await refreshDailySheet()

    // 2. Conectar al biométrico si la configuración fue resuelta
    if (activeTerminalConfig) {
      startLocalBiometricStream(
        activeTerminalConfig,
        (cedula) => {
          handleLocalDetection(cedula)
        },
        POLL_INTERVAL_MS
      )
    }

    // 3. Iniciar worker de sincronización asíncrona cada 30 segundos
    setInterval(syncPendingQueueWorker, 30000)

    // 4. Refrescar padrón automáticamente de forma periódica
    setInterval(refreshDailySheet, REFRESH_INTERVAL_MIN * 60 * 1000)
    console.log(`⏱️ [EdgeAgent] Intervalo de actualización de padrón programado cada ${REFRESH_INTERVAL_MIN} minutos.`)
  })
}

bootstrap().catch((err) => {
  console.error('❌ Error fatal iniciando Edge Agent:', err)
})
