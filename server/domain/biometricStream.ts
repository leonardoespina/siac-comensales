/**
 * CAPA 1: DOMINIO PURA — Gestión de Estado y Tiempos de Streams Biométricos
 * 
 * REGLE DE ORO (AGENTS.md):
 * - CERO imports de librerías externas o frameworks (no prisma, no h3, no http).
 * - Solo funciones puras (input -> output).
 */

export type StreamStatus = 'CONNECTING' | 'CONNECTED' | 'BACKOFF' | 'DOWN' | 'STOPPED'

export interface StreamSnapshot {
  diningRoomId: number
  diningRoomName: string
  status: StreamStatus
  displayStatus: 'CONNECTED' | 'CONNECTING' | 'DOWN'
  attempt: number
  lastDataAt: string | null
  lastError: string | null
  nextRetryAt: string | null
  canManualRestart: boolean
  cooldownRemainingSec: number
}

export const STREAM_HEARTBEAT_TIMEOUT_MS = 45_000 // 45 segundos de silencio antes de verificar status
export const STREAM_BACKOFF_BASE_MS = 5_000
export const STREAM_BACKOFF_MAX_MS = 60_000
export const STREAM_MANUAL_RESTART_COOLDOWN_MS = 30_000 // 30s de cooldown anti-spam
export const STREAM_DOWN_ATTEMPTS_THRESHOLD = 2

/**
 * Calcula el retardo de reconexión exponencial con un techo máximo de 60s.
 */
export function computeBackoffDelay(attempt: number): number {
  if (attempt <= 0) return STREAM_BACKOFF_BASE_MS
  const delay = STREAM_BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
  return Math.min(delay, STREAM_BACKOFF_MAX_MS)
}

/**
 * Determina si un stream ha estado silencioso por más tiempo del umbral permitido.
 */
export function isHeartbeatStale(lastDataAt: Date | null, now: Date, timeoutMs: number = STREAM_HEARTBEAT_TIMEOUT_MS): boolean {
  if (!lastDataAt) return true
  return now.getTime() - lastDataAt.getTime() > timeoutMs
}

/**
 * Evalúa si se permite una reconexión manual y calcula los segundos de espera restantes.
 */
export function evaluateManualRestart(
  lastManualAt: Date | null,
  now: Date,
  cooldownMs: number = STREAM_MANUAL_RESTART_COOLDOWN_MS
): { allowed: boolean; retryAfterSec: number } {
  if (!lastManualAt) return { allowed: true, retryAfterSec: 0 }
  const elapsed = now.getTime() - lastManualAt.getTime()
  if (elapsed >= cooldownMs) {
    return { allowed: true, retryAfterSec: 0 }
  }
  const remainingMs = cooldownMs - elapsed
  return {
    allowed: false,
    retryAfterSec: Math.ceil(remainingMs / 1000)
  }
}

/**
 * Mapea el estado técnico a un estado simplificado de presentación para la UI (🟢, 🟡, 🔴).
 */
export function resolveDisplayStatus(status: StreamStatus, attempt: number): 'CONNECTED' | 'CONNECTING' | 'DOWN' {
  if (status === 'CONNECTED') return 'CONNECTED'
  if (status === 'STOPPED' || status === 'DOWN' || attempt >= STREAM_DOWN_ATTEMPTS_THRESHOLD) {
    return 'DOWN'
  }
  return 'CONNECTING'
}
