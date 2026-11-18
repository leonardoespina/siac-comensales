import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openAcsPollingConnection } from '../../server/services/hikvision/acsPolling'
import * as client from '../../server/services/hikvision/client'

vi.mock('../../server/services/hikvision/client', () => ({
  executeIsapiRequest: vi.fn(),
  fetchDeviceChallenge: vi.fn(),
  buildDigestAuthHeader: vi.fn(() => 'Digest mock')
}))

describe('Resiliencia Biométrica y Circuit Breaker (acsPolling)', () => {
  const mockDevice = {
    diningRoomId: 2,
    diningRoomName: 'COMEDOR EMILIA MSB',
    ip: '10.80.0.60',
    port: 443,
    user: 'admin',
    password: 'password',
    enabled: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe cortar el bucle y llamar a onClose tras 5 fallos consecutivos en pollLoop', async () => {
    const mockExecute = vi.mocked(client.executeIsapiRequest)

    // 1ra llamada (init): responde OK con serial base 500
    mockExecute.mockResolvedValueOnce({
      statusCode: 200,
      data: JSON.stringify({ AcsEvent: { totalMatches: 1, InfoList: [{ serialNo: 500 }] } }),
      buffer: Buffer.from('')
    })

    // Siguientes 5 llamadas (pollLoop): fallan por timeout de red
    mockExecute.mockRejectedValue(new Error('Timeout en petición ISAPI'))

    let closedReason = ''
    const onData = vi.fn()
    const onClose = vi.fn((reason: string) => {
      closedReason = reason
    })

    // Usamos un intervalo corto (10ms) para el test, pero recordemos que tras error usa 2000ms si no usamos fake timers
    vi.useFakeTimers()

    openAcsPollingConnection(mockDevice, { onData, onClose }, 50)

    // Avanzar timers para permitir que se ejecute el init y los 5 reintentos espaciados
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(2100)
    }

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(closedReason).toContain('Conexión perdida tras 5 intentos')

    // Verificar que después de cerrarse NO sigue haciendo peticiones
    const callsAtClose = mockExecute.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(mockExecute.mock.calls.length).toBe(callsAtClose)

    vi.useRealTimers()
  })

  it('debe reiniciar consecutiveErrors a 0 si el comedor recupera la red antes del 5to intento', async () => {
    const mockExecute = vi.mocked(client.executeIsapiRequest)

    // 1. Init OK
    mockExecute.mockResolvedValueOnce({
      statusCode: 200,
      data: JSON.stringify({ AcsEvent: { totalMatches: 1, InfoList: [{ serialNo: 100 }] } }),
      buffer: Buffer.from('')
    })

    // 2. Tres fallos transitorios seguidos (3 < 5)
    mockExecute
      .mockRejectedValueOnce(new Error('Micro-corte 1'))
      .mockRejectedValueOnce(new Error('Micro-corte 2'))
      .mockRejectedValueOnce(new Error('Micro-corte 3'))

    // 3. Se recupera al 4to intento (responde 200 OK)
    mockExecute.mockResolvedValueOnce({
      statusCode: 200,
      data: JSON.stringify({ AcsEvent: { totalMatches: 1, InfoList: [{ serialNo: 100 }] } }),
      buffer: Buffer.from('')
    })

    // 4. Otros dos fallos más tarde (no debe cerrar porque el contador volvió a 0)
    mockExecute
      .mockRejectedValueOnce(new Error('Micro-corte 4'))
      .mockRejectedValueOnce(new Error('Micro-corte 5'))

    const onData = vi.fn()
    const onClose = vi.fn()

    vi.useFakeTimers()
    const conn = openAcsPollingConnection(mockDevice, { onData, onClose }, 50)

    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(2100)
    }

    // No debe haberse cerrado porque nunca llegó a 5 errores SEGUIDOS
    expect(onClose).not.toHaveBeenCalled()

    conn.close()
    vi.useRealTimers()
  })
})
