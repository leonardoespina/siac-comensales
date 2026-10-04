/**
 * SUB-SERVICIO: Gestión de Usuarios en Terminal Hikvision (ISAPI)
 * 
 * RESPONSABILIDAD:
 * - Creación, consulta y eliminación de fichas de usuario en memoria del terminal.
 */

import { HikvisionDeviceConfig, sanitizeEmployeeNo } from '../../domain/biometrics'
import { executeIsapiRequest } from './client'

/**
 * Registra o actualiza la ficha de usuario básica (sin foto) en un terminal.
 */
export async function pushUserToDevice(
  device: HikvisionDeviceConfig,
  payload: { cedula: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(payload.cedula)
  if (!cleanCedula) {
    return { success: false, error: 'Cédula inválida' }
  }

  const setupBody = JSON.stringify({
    UserInfo: {
      employeeNo: cleanCedula,
      name: payload.name.slice(0, 32).toUpperCase().trim(),
      userType: 'normal',
      closeDelay: 0,
      Valid: {
        enable: true,
        beginTime: '2026-01-01T00:00:00',
        endTime: '2035-12-31T23:59:59',
        timeType: 'local'
      },
      doorRight: '1',
      RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
    }
  })

  try {
    const res = await executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/SetUp?format=json', 'PUT', setupBody)
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Elimina un usuario y todas sus credenciales de un terminal específico.
 */
export async function deleteUserFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    return { success: false, error: 'Cédula inválida' }
  }

  const deleteBody = JSON.stringify({
    UserInfoDelCond: {
      EmployeeNoList: [{ employeeNo: cleanCedula }]
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/AccessControl/UserInfo/Delete?format=json',
      'PUT',
      deleteBody
    )
    return {
      success: res.statusCode === 200,
      error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}: ${res.data}`
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
