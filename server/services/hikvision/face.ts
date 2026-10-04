/**
 * SUB-SERVICIO: Gestión de Rostros y Almacenamiento en Disco (ISAPI)
 * 
 * RESPONSABILIDAD:
 * - Inyección y extracción de fotos faciales (FDLib / FaceDataRecord).
 * - Sincronización de fichas de usuario y rostros en dispositivos.
 * - Almacenamiento local en disco en storage/biometrics/faces/.
 */

import fs from 'fs'
import path from 'path'
import { URL } from 'url'
import {
  HikvisionDeviceConfig,
  sanitizeEmployeeNo
} from '../../domain/biometrics'
import { executeIsapiRequest } from './client'

export const STORAGE_FACES_DIR = path.join(process.cwd(), 'storage', 'biometrics', 'faces')

export function ensureStorageDirExists() {
  if (!fs.existsSync(STORAGE_FACES_DIR)) {
    fs.mkdirSync(STORAGE_FACES_DIR, { recursive: true })
  }
}

/**
 * Consulta un terminal para extraer la foto del rostro enrolado y guardarla en disco.
 */
export async function fetchAndStoreFaceFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<string | null> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) return null

  ensureStorageDirExists()

  const searchBody = JSON.stringify({
    UserInfoSearchCond: {
      searchID: '1',
      searchResultPosition: 0,
      maxResults: 1,
      EmployeeNoList: [{ employeeNo: cleanCedula }]
    }
  })

  const userRes = await executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/Search?format=json', 'POST', searchBody)
  if (userRes.statusCode !== 200) return null

  try {
    const parsed = JSON.parse(userRes.data)
    const user = parsed.UserInfoSearch?.UserInfo?.[0]
    if (!user || !user.faceURL) return null

    const urlObj = new URL(user.faceURL)
    const relativeFacePath = urlObj.pathname + (urlObj.search || '')

    const picRes = await executeIsapiRequest(device, relativeFacePath, 'GET', undefined, 'image/jpeg')
    if (picRes.statusCode === 200 && picRes.buffer.length > 500) {
      const filePath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
      fs.writeFileSync(filePath, picRes.buffer)
      return `/storage/biometrics/faces/${cleanCedula}.jpg`
    }
  } catch {
    return null
  }

  return null
}

/**
 * Registra o actualiza un usuario y su foto facial en un terminal biométrico específico.
 */
export async function pushUserAndFaceToDevice(
  device: HikvisionDeviceConfig,
  payload: {
    cedula: string
    name: string
    photoBuffer?: Buffer | null
  }
): Promise<{ userSuccess: boolean; faceSuccess: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(payload.cedula)
  if (!cleanCedula) {
    return { userSuccess: false, faceSuccess: false, error: 'Cédula inválida' }
  }

  // 1. Registrar o actualizar ficha de usuario
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

  const userRes = await executeIsapiRequest(device, '/ISAPI/AccessControl/UserInfo/SetUp?format=json', 'PUT', setupBody)
  const userSuccess = userRes.statusCode === 200

  if (!userSuccess) {
    return { userSuccess: false, faceSuccess: false, error: `Error creando usuario: [HTTP ${userRes.statusCode}] ${userRes.data}` }
  }

  // 2. Si se proporciona foto, inyectarla vía FDLib/FaceDataRecord
  let faceSuccess = false
  if (payload.photoBuffer && payload.photoBuffer.length > 500) {
    const boundary = '----HikvisionSIACSyncBoundary'
    const jsonPart = JSON.stringify({
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: cleanCedula
    })

    let headerStr = `--${boundary}\r\n`
    headerStr += 'Content-Disposition: form-data; name="FaceDataRecord"\r\n'
    headerStr += 'Content-Type: application/json\r\n\r\n'
    headerStr += jsonPart + '\r\n'
    headerStr += `--${boundary}\r\n`
    headerStr += 'Content-Disposition: form-data; name="FaceImage"; filename="face.jpg"\r\n'
    headerStr += 'Content-Type: image/jpeg\r\n\r\n'

    const headBuf = Buffer.from(headerStr, 'utf8')
    const tailBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    const multipartBody = Buffer.concat([headBuf, payload.photoBuffer, tailBuf])

    const faceRes = await executeIsapiRequest(
      device,
      '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json',
      'POST',
      multipartBody,
      `multipart/form-data; boundary=${boundary}`
    )

    faceSuccess = faceRes.statusCode === 200
  }

  return { userSuccess, faceSuccess }
}

/**
 * Elimina la foto facial de un usuario en un terminal específico.
 */
export async function deleteFaceFromDevice(
  device: HikvisionDeviceConfig,
  cedula: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    return { success: false, error: 'Cédula inválida' }
  }

  const deleteBody = JSON.stringify({
    FDLibCondition: {
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: cleanCedula
    }
  })

  try {
    const res = await executeIsapiRequest(
      device,
      '/ISAPI/Intelligent/FDLib/FaceDataRecord/Delete?format=json',
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
