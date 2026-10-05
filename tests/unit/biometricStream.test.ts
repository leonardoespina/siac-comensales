import { describe, it, expect } from 'vitest'
import {
  computeBackoffDelay,
  isHeartbeatStale,
  evaluateManualRestart,
  resolveDisplayStatus,
  STREAM_BACKOFF_BASE_MS,
  STREAM_BACKOFF_MAX_MS,
  STREAM_MANUAL_RESTART_COOLDOWN_MS
} from '../../server/domain/biometricStream'

describe('⚙️ Dominio Biométrico - biometricStream.ts', () => {
  it('1. computeBackoffDelay: Debe calcular retrasos exponenciales y respetar el techo máximo (60s)', () => {
    expect(computeBackoffDelay(0)).toBe(STREAM_BACKOFF_BASE_MS) // 5s
    expect(computeBackoffDelay(1)).toBe(5000)                   // 5s
    expect(computeBackoffDelay(2)).toBe(10000)                  // 10s
    expect(computeBackoffDelay(3)).toBe(20000)                  // 20s
    expect(computeBackoffDelay(4)).toBe(40000)                  // 40s
    expect(computeBackoffDelay(5)).toBe(STREAM_BACKOFF_MAX_MS)  // 60s (Techo)
    expect(computeBackoffDelay(10)).toBe(STREAM_BACKOFF_MAX_MS) // 60s (Techo)
  })

  it('2. isHeartbeatStale: Debe detectar inactividad cuando se supera el tiempo límite', () => {
    const now = new Date('2026-10-05T12:00:00.000Z')
    const fresh = new Date('2026-10-05T11:59:30.000Z') // HACE 30s
    const stale = new Date('2026-10-05T11:58:00.000Z') // HACE 120s

    expect(isHeartbeatStale(fresh, now, 45000)).toBe(false)
    expect(isHeartbeatStale(stale, now, 45000)).toBe(true)
    expect(isHeartbeatStale(null, now, 45000)).toBe(true)
  })

  it('3. evaluateManualRestart: Debe aplicar cooldown anti-spam de 30 segundos', () => {
    const now = new Date('2026-10-05T12:00:00.000Z')
    const recentRestart = new Date('2026-10-05T11:59:45.000Z') // HACE 15s

    // Primera reconexión
    const res1 = evaluateManualRestart(null, now)
    expect(res1.allowed).toBe(true)
    expect(res1.retryAfterSec).toBe(0)

    // Reintento en enfriamiento (15s transcurridos, restan 15s)
    const res2 = evaluateManualRestart(recentRestart, now, STREAM_MANUAL_RESTART_COOLDOWN_MS)
    expect(res2.allowed).toBe(false)
    expect(res2.retryAfterSec).toBe(15)

    // Reintento pasados 30s
    const oldRestart = new Date('2026-10-05T11:59:20.000Z') // HACE 40s
    const res3 = evaluateManualRestart(oldRestart, now, STREAM_MANUAL_RESTART_COOLDOWN_MS)
    expect(res3.allowed).toBe(true)
    expect(res3.retryAfterSec).toBe(0)
  })

  it('4. resolveDisplayStatus: Debe mapear estados técnicos a presentación visual', () => {
    expect(resolveDisplayStatus('CONNECTED', 0)).toBe('CONNECTED')
    expect(resolveDisplayStatus('CONNECTING', 0)).toBe('CONNECTING')
    expect(resolveDisplayStatus('BACKOFF', 1)).toBe('CONNECTING')
    expect(resolveDisplayStatus('BACKOFF', 2)).toBe('DOWN')
    expect(resolveDisplayStatus('DOWN', 0)).toBe('DOWN')
    expect(resolveDisplayStatus('STOPPED', 0)).toBe('DOWN')
  })
})
