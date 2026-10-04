/**
 * SUB-SERVICIO: Gestión de Huellas Dactilares en Terminal Hikvision (ISAPI)
 * 
 * RESPONSABILIDAD:
 * - Extracción e inyección de plantillas biométricas dactilares.
 */

import {
  HikvisionDeviceConfig,
  HikvisionFingerprintItem,
  sanitizeEmployeeNo
} from '../../domain/biometrics'
import { executeIsapiRequest } from './client'

/**
 * Consulta un terminal para extraer la plantilla biométrica de huella de un usuario.
 */
export async function fetchFingerprintFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string,
  fingerPrintID = 1
): Promise<HikvisionFingerprintItem | null> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) return null

  const searchId = String(Date.now())
  const searchBody = JSON.stringify({
    FingerPrintCond: {
      searchID: searchId,
      employeeNo: cleanCedula,
      enableCardReader: [1],
      fingerPrintID
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/FingerPrintUpload?format=json',
      'POST',
      searchBody
    )
    if (res.statusCode !== 200) return null

    const parsed = JSON.parse(res.data)
    const fpItem = parsed.FingerPrintInfo?.FingerPrintList?.[0]
    if (fpItem && fpItem.fingerData) {
      return {
        cardReaderNo: fpItem.cardReaderNo || 1,
        fingerPrintID: fpItem.fingerPrintID || fingerPrintID,
        fingerType: fpItem.fingerType || 'normalFP',
        fingerData: fpItem.fingerData
      }
    }
  } catch (err: any) {
    console.error(`❌ [Hikvision FP] Error extrayendo huella para ${cleanCedula} en ${device.diningRoomName}:`, err?.message || err)
  }

  return null
}

/**
 * Inyecta una plantilla biométrica de huella dactilar hacia un terminal específico.
 */
export async function pushFingerprintToDevice(
  device: HikvisionDeviceConfig,
  payload: {
    cedula: string
    fpItem: HikvisionFingerprintItem
  }
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(payload.cedula)
  if (!cleanCedula) return { success: false, error: 'Cédula inválida' }

  const body = JSON.stringify({
    FingerPrintCfg: {
      employeeNo: cleanCedula,
      enableCardReader: [payload.fpItem.cardReaderNo || 1],
      fingerPrintID: payload.fpItem.fingerPrintID || 1,
      fingerType: payload.fpItem.fingerType || 'normalFP',
      fingerData: payload.fpItem.fingerData
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/FingerPrintDownload?format=json',
      'POST',
      body
    )
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
