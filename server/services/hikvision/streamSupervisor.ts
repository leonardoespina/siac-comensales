/**
 * SUB-SERVICIO: Supervisor de Streams y Reconexión Automática Multi-Sede
 * 
 * RESPONSABILIDAD:
 * - Mantiene el estado en memoria de los streams por cada comedor activo.
 * - Ejecuta un watchdog de inactividad (10s) que realiza verificaciones de salud livianas.
 * - Programa reintentos exponenciales automáticos al detectar desconexiones.
 */

import {
  StreamStatus,
  StreamSnapshot,
  computeBackoffDelay,
  isHeartbeatStale,
  resolveDisplayStatus,
  STREAM_HEARTBEAT_TIMEOUT_MS
} from '../../domain/biometricStream'
import { HikvisionDeviceConfig } from '../../domain/biometrics'
import { openAlertStreamConnection } from './streamConnection'
import { checkTerminalHealth } from './health'
import { emitEvent } from '../../utils/eventBus'
import { listActiveBiometricDiningRooms } from '../../repository/biometricRepository'

interface StreamState {
  device: HikvisionDeviceConfig
  status: StreamStatus
  attempt: number
  lastDataAt: Date | null
  lastError: string | null
  nextRetryAt: Date | null
  lastManualRestartAt: Date | null
  connection: { close: () => void } | null
  retryTimer: NodeJS.Timeout | null
}

const globalObj = globalThis as any
const streamRegistry: Map<number, StreamState> = globalObj.__hikvisionStreamRegistry || (globalObj.__hikvisionStreamRegistry = new Map())
let watchdogTimer: NodeJS.Timeout | null = globalObj.__hikvisionWatchdogTimer || null

function notifyStatusChange(state: StreamState) {
  const displayStatus = resolveDisplayStatus(state.status, state.attempt)
  const snapshot: StreamSnapshot = {
    diningRoomId: state.device.diningRoomId,
    diningRoomName: state.device.diningRoomName,
    status: state.status,
    displayStatus,
    attempt: state.attempt,
    lastDataAt: state.lastDataAt ? state.lastDataAt.toISOString() : null,
    lastError: state.lastError,
    nextRetryAt: state.nextRetryAt ? state.nextRetryAt.toISOString() : null,
    canManualRestart: state.status === 'DOWN' || displayStatus === 'DOWN',
    cooldownRemainingSec: 0
  }

  emitEvent('biometric:stream_status_changed', snapshot as any)
}

export function getStreamSnapshot(diningRoomId: number): StreamSnapshot | null {
  const state = streamRegistry.get(diningRoomId)
  if (!state) return null
  const displayStatus = resolveDisplayStatus(state.status, state.attempt)
  return {
    diningRoomId: state.device.diningRoomId,
    diningRoomName: state.device.diningRoomName,
    status: state.status,
    displayStatus,
    attempt: state.attempt,
    lastDataAt: state.lastDataAt ? state.lastDataAt.toISOString() : null,
    lastError: state.lastError,
    nextRetryAt: state.nextRetryAt ? state.nextRetryAt.toISOString() : null,
    canManualRestart: state.status === 'DOWN' || displayStatus === 'DOWN',
    cooldownRemainingSec: 0
  }
}

export function getAllStreamSnapshots(): StreamSnapshot[] {
  const result: StreamSnapshot[] = []
  for (const [id] of streamRegistry) {
    const snap = getStreamSnapshot(id)
    if (snap) result.push(snap)
  }
  return result
}

export function startStream(device: HikvisionDeviceConfig) {
  let state = streamRegistry.get(device.diningRoomId)
  if (!state) {
    state = {
      device,
      status: 'CONNECTING',
      attempt: 0,
      lastDataAt: null,
      lastError: null,
      nextRetryAt: null,
      lastManualRestartAt: null,
      connection: null,
      retryTimer: null
    }
    streamRegistry.set(device.diningRoomId, state)
  } else {
    state.device = device
  }

  if (state.connection) {
    state.connection.close()
    state.connection = null
  }
  if (state.retryTimer) {
    clearTimeout(state.retryTimer)
    state.retryTimer = null
  }

  state.status = 'CONNECTING'
  state.nextRetryAt = null
  notifyStatusChange(state)

  state.connection = openAlertStreamConnection(device, {
    onData: (objects) => {
      state!.lastDataAt = new Date()
      state!.attempt = 0
      state!.lastError = null
      if (state!.status !== 'CONNECTED') {
        state!.status = 'CONNECTED'
        notifyStatusChange(state!)
      }
    },
    onClose: (reason) => {
      state!.connection = null
      state!.lastError = reason
      state!.attempt++
      state!.status = 'BACKOFF'

      const delayMs = computeBackoffDelay(state!.attempt)
      state!.nextRetryAt = new Date(Date.now() + delayMs)
      notifyStatusChange(state!)

      state!.retryTimer = setTimeout(() => {
        state!.retryTimer = null
        startStream(device)
      }, delayMs)
    }
  })

  ensureWatchdogRunning()
}

export function stopStream(diningRoomId: number) {
  const state = streamRegistry.get(diningRoomId)
  if (!state) return
  if (state.retryTimer) clearTimeout(state.retryTimer)
  if (state.connection) state.connection.close()
  state.status = 'STOPPED'
  notifyStatusChange(state)
  streamRegistry.delete(diningRoomId)
}

function ensureWatchdogRunning() {
  if (watchdogTimer) return
  watchdogTimer = setInterval(async () => {
    const now = new Date()
    for (const [, state] of streamRegistry) {
      if (state.status === 'CONNECTED' && isHeartbeatStale(state.lastDataAt, now, STREAM_HEARTBEAT_TIMEOUT_MS)) {
        // Sondeo liviano antes de tumbar el stream
        const health = await checkTerminalHealth(state.device).catch(() => ({ online: false }))
        if (!health.online) {
          console.warn(`⚠️ [Hikvision Watchdog] Terminal en ${state.device.diningRoomName} sin respuesta. Forzando reconexión...`)
          if (state.connection) {
            state.connection.close()
          }
        }
      }
    }
  }, 10000)
  globalObj.__hikvisionWatchdogTimer = watchdogTimer
}

export async function initSupervisorAllStreams() {
  const activeRooms = await listActiveBiometricDiningRooms()
  for (const room of activeRooms) {
    if (!room.deviceIp) continue
    startStream({
      diningRoomId: room.id,
      diningRoomName: room.name,
      ip: room.deviceIp,
      port: room.devicePort || 443,
      user: room.deviceUser || 'admin',
      password: room.devicePassword || '',
      enabled: room.deviceEnabled
    })
  }
}
