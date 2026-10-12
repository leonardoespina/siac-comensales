import { describe, it, expect, vi } from 'vitest'
import { sanitizeEmployeeNo } from '../../server/domain/biometrics'
import { processUploadedFace } from '../../server/services/hikvision/uploadFace'
import { ValidationError, NotFoundError } from '../../server/domain/errors'

// Mock de dependencias externas del sub-servicio
vi.mock('../../server/repository/biometricRepository', () => ({
  getDinerWithBiometricsByCedula: vi.fn(async (cedula: string) => {
    if (cedula === '12345678') {
      return { id: 101, name: 'JUAN PEREZ', cedula: '12345678' }
    }
    return null
  })
}))

vi.mock('../../server/utils/eventBus', () => ({
  emitEvent: vi.fn()
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  }
}))

describe('Sub-Servicio: processUploadedFace (Edge & Bypass Capture)', () => {
  it('rechaza cédulas vacías o inválidas con ValidationError', async () => {
    await expect(processUploadedFace('', 'data:image/jpeg;base64,...')).rejects.toThrow(ValidationError)
    await expect(processUploadedFace('   ', 'data:image/jpeg;base64,...')).rejects.toThrow(ValidationError)
  })

  it('rechaza llamadas sin foto base64 con ValidationError', async () => {
    await expect(processUploadedFace('12345678', '')).rejects.toThrow(ValidationError)
  })

  it('arroja NotFoundError si el comensal no existe en la base de datos', async () => {
    await expect(processUploadedFace('99999999', 'data:image/jpeg;base64,...')).rejects.toThrow(NotFoundError)
  })

  it('rechaza payloads que no son JPEG válido (sin cabecera SOI 0xFF, 0xD8)', async () => {
    // Generar buffer de más de 500 bytes pero con cabecera corrupta / PNG / texto
    const fakeBuffer = Buffer.alloc(600, 0x41) // 'A'
    const fakeBase64 = fakeBuffer.toString('base64')

    await expect(processUploadedFace('12345678', fakeBase64)).rejects.toThrow(ValidationError)
  })

  it('procesa y persiste exitosamente un JPEG válido', async () => {
    // Generar un buffer válido simulado con SOI (0xFF, 0xD8) y tamaño > 500 bytes
    const validJpeg = Buffer.alloc(800, 0x20)
    validJpeg[0] = 0xFF
    validJpeg[1] = 0xD8
    const validBase64 = `data:image/jpeg;base64,${validJpeg.toString('base64')}`

    const result = await processUploadedFace('V-12.345.678', validBase64, 2)

    expect(result.success).toBe(true)
    expect(result.cedula).toBe('12345678')
    expect(result.name).toBe('JUAN PEREZ')
    expect(result.photoUrl).toContain('/api/biometrics/face/12345678')
    expect(result.fileSizeKB).toBeGreaterThan(0.5)
  })

  it('sanitiza correctamente cédulas con prefijos y formato latino', () => {
    expect(sanitizeEmployeeNo('V-18.073.921')).toBe('18073921')
    expect(sanitizeEmployeeNo('E-82.111.222')).toBe('82111222')
    expect(sanitizeEmployeeNo('   25999888   ')).toBe('25999888')
    expect(sanitizeEmployeeNo('')).toBe('')
  })
})
