import { describe, it, expect } from 'vitest'
import { 
  SESSION_INACTIVITY_TIMEOUT_MINUTES, 
  isSessionActive, 
  isDispatchExclusiveRole 
} from '../../server/domain/auth'

describe('Lógica de Sesión Única e Inactividad', () => {
  it('debe definir la duración de la sesión en 24 horas (1440 minutos)', () => {
    expect(SESSION_INACTIVITY_TIMEOUT_MINUTES).toBe(24 * 60)
  })

  it('debe detectar una sesión como activa si la última actividad fue hace menos de 24 horas', () => {
    const lastActiveAt = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 horas atrás
    expect(isSessionActive(lastActiveAt)).toBe(true)
  })

  it('debe considerar la sesión como abandonada/inactiva si pasaron más de 24 horas', () => {
    const lastActiveAt = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 horas atrás
    expect(isSessionActive(lastActiveAt)).toBe(false)
  })

  it('debe considerar la sesión como activa por seguridad si lastActiveAt es null pero existe sessionId', () => {
    expect(isSessionActive(null)).toBe(true)
  })

  it('debe aplicar la política de sesión única estricta a todos los usuarios', () => {
    const permissions = [
      { module: { code: 'DISPATCH' }, canRead: true, canUpdate: true }
    ]
    expect(isDispatchExclusiveRole(permissions)).toBe(false)
  })
})
