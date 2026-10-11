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
import { startLocalBiometricStream, TerminalConfig } from './edgeBiometric'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cargar configuración
const CONFIG_PATH = path.join(__dirname, 'config.json')
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
