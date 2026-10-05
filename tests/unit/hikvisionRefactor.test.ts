/**
 * TEST SUITE: Verificación Arquitectónica de Sub-Servicios Hikvision
 * 
 * Regla AGENTS.md:
 * - Pruebas unitarias aisladas (Capa de Dominio y Sub-servicios desacoplados).
 */

import { describe, it, expect, vi } from 'vitest'

// Mock de la capa de repositorio para pruebas unitarias puras y aisladas
vi.mock('../../server/repository/biometricRepository', () => ({
  listActiveBiometricDiningRooms: vi.fn().mockResolvedValue([]),
  getDiningRoomDeviceById: vi.fn().mockResolvedValue(null),
  getDinerWithBiometricsByCedula: vi.fn().mockResolvedValue(null),
  getDinerWithBiometricsById: vi.fn().mockResolvedValue(null),
  upsertBiometricRecord: vi.fn().mockResolvedValue(null)
}))

// Mock de eventBus
vi.mock('../../server/utils/eventBus', () => ({
  emitEvent: vi.fn()
}))

import * as hikvisionClient from '../../server/services/hikvision/client'
import * as hikvisionUser from '../../server/services/hikvision/user'
import * as hikvisionFingerprint from '../../server/services/hikvision/fingerprint'
import * as hikvisionFace from '../../server/services/hikvision/face'
import * as hikvisionCapture from '../../server/services/hikvision/capture'
import * as hikvisionHealth from '../../server/services/hikvision/health'
import * as hikvisionSyncHub from '../../server/services/hikvision/syncHub'
import * as hikvisionStream from '../../server/services/hikvision/stream'
import * as hikvisionServiceLegacy from '../../server/services/hikvisionService'
import { sanitizeEmployeeNo, isValidCedula, buildDeviceBaseUrl, mapVerifyMode } from '../../server/domain/biometrics'

describe('🏛️ Arquitectura Modular Hikvision (Sub-Servicios)', () => {

  it('1. Debe exportar funciones del cliente ISAPI y Digest Auth', () => {
    expect(typeof hikvisionClient.parseDigestHeader).toBe('function')
    expect(typeof hikvisionClient.buildDigestAuthHeader).toBe('function')
    expect(typeof hikvisionClient.fetchDeviceChallenge).toBe('function')
    expect(typeof hikvisionClient.executeIsapiRequest).toBe('function')
  })

  it('2. Debe exportar funciones de gestión de usuarios', () => {
    expect(typeof hikvisionUser.pushUserToDevice).toBe('function')
    expect(typeof hikvisionUser.deleteUserFromDevice).toBe('function')
  })

  it('3. Debe exportar funciones de huellas dactilares', () => {
    expect(typeof hikvisionFingerprint.fetchFingerprintFromDevice).toBe('function')
    expect(typeof hikvisionFingerprint.pushFingerprintToDevice).toBe('function')
  })

  it('4. Debe exportar funciones de biometría facial y snapshot', () => {
    expect(typeof hikvisionFace.pushUserAndFaceToDevice).toBe('function')
    expect(typeof hikvisionFace.fetchAndStoreFaceFromDevice).toBe('function')
    expect(typeof hikvisionFace.deleteFaceFromDevice).toBe('function')
    expect(typeof hikvisionCapture.getLiveCameraSnapshot).toBe('function')
    expect(typeof hikvisionCapture.captureAndEnrollDinerFace).toBe('function')
    expect(typeof hikvisionCapture.triggerInteractiveDeviceFaceCapture).toBe('function')
  })

  it('5. Debe exportar funciones de healthcheck y diagnóstico', () => {
    expect(typeof hikvisionHealth.checkTerminalHealth).toBe('function')
  })

  it('6. Debe exportar orquestación de sincronización multi-sede', () => {
    expect(typeof hikvisionSyncHub.syncDinerAcrossAllTerminals).toBe('function')
    expect(typeof hikvisionSyncHub.clearDinerBiometricsAcrossAllTerminals).toBe('function')
  })

  it('7. Debe exportar supervisor de streaming y control de reconexión manual', () => {
    expect(typeof hikvisionServiceLegacy.startStream).toBe('function')
    expect(typeof hikvisionServiceLegacy.stopStream).toBe('function')
    expect(typeof hikvisionServiceLegacy.initSupervisorAllStreams).toBe('function')
    expect(typeof hikvisionServiceLegacy.requestManualStreamRestart).toBe('function')
  })

  it('8. Retrocompatibilidad: El proxy hikvisionService.ts debe re-exportar todas las funciones', () => {
    expect(typeof hikvisionServiceLegacy.getLiveCameraSnapshot).toBe('function')
    expect(typeof hikvisionServiceLegacy.captureAndEnrollDinerFace).toBe('function')
    expect(typeof hikvisionServiceLegacy.syncDinerAcrossAllTerminals).toBe('function')
    expect(typeof hikvisionServiceLegacy.checkTerminalHealth).toBe('function')
    expect(typeof hikvisionServiceLegacy.executeIsapiRequest).toBe('function')
  })

  it('9. Validación de funciones puras de dominio', () => {
    expect(sanitizeEmployeeNo('V-18073921')).toBe('18073921')
    expect(sanitizeEmployeeNo('18.073.921')).toBe('18073921')
    expect(isValidCedula('18073921')).toBe(true)
    expect(isValidCedula('123')).toBe(false)
    expect(buildDeviceBaseUrl('10.60.0.110', 443)).toBe('https://10.60.0.110')
    expect(mapVerifyMode('face')).toBe('face')
    expect(mapVerifyMode('fingerPrint')).toBe('fingerprint')
  })

  it('10. Digest Auth: Debe construir header RFC 2617 válido', () => {
    const challenge = {
      realm: 'IP Camera(C1710)',
      nonce: '4e32303031303233343a',
      qop: 'auth'
    }
    const header = hikvisionClient.buildDigestAuthHeader(
      'GET',
      '/ISAPI/System/deviceInfo',
      challenge,
      'admin',
      'test-password'
    )
    expect(header).toContain('Digest username="admin"')
    expect(header).toContain('realm="IP Camera(C1710)"')
    expect(header).toContain('nonce="4e32303031303233343a"')
    expect(header).toContain('uri="/ISAPI/System/deviceInfo"')
    expect(header).toContain('response=')
  })

  it('11. Parser Multipart: Debe extraer correctamente JSONs con llaves anidadas', () => {
    const rawChunk = `--MIME_boundary\r\nContent-Type: application/json; charset="UTF-8"\r\n\r\n{"ipAddress":"10.60.0.110","AccessControllerEvent":{"employeeNoString":"18073921","name":"LEONARDO ESPINA","currentVerifyMode":"face"}}\r\n--MIME_boundary`
    const { objects, remaining } = hikvisionStream.extractJsonObjectsFromBuffer(rawChunk)
    expect(objects).toHaveLength(1)
    expect(objects[0].AccessControllerEvent.employeeNoString).toBe('18073921')
    expect(objects[0].AccessControllerEvent.name).toBe('LEONARDO ESPINA')
    expect(objects[0].AccessControllerEvent.currentVerifyMode).toBe('face')
  })
})
