/**
 * SUB-SERVICIO: Captura Remota y Enrolamiento Facial Interactivo (ISAPI)
 * 
 * RESPONSABILIDAD:
 * - Modo interactivo en pantalla física del terminal (/ISAPI/AccessControl/CaptureFaceData).
 * - Snapshots de cámara en vivo para streaming (/ISAPI/Streaming/channels/101/picture).
 * - Orquestación de enrolamiento facial y auto-replicación.
 */

import fs from 'fs'
import path from 'path'
import {
  HikvisionDeviceConfig,
  RemoteCaptureResult,
  LiveSnapshotResult,
  sanitizeEmployeeNo
} from '../../domain/biometrics'
import { executeIsapiRequest } from './client'
import { STORAGE_FACES_DIR, ensureStorageDirExists, pushUserAndFaceToDevice } from './face'
import * as biometricRepo from '../../repository/biometricRepository'
import { emitEvent } from '../../utils/eventBus'

/**
 * Dispara el modo de captura interactivo en la pantalla física del terminal Hikvision.
 * El comensal se ve en el LCD del biométrico, presiona el botón de captura y el SIAC
 * recibe el JPEG, lo asocia a su cédula y lo replica a todas las sedes.
 */
export async function triggerInteractiveDeviceFaceCapture(
  diningRoomId: number,
  cedula: string,
  timeoutMs = 30000
): Promise<RemoteCaptureResult> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    throw new Error('Cédula de comensal inválida')
  }

  const diner = await biometricRepo.getDinerWithBiometricsByCedula(cleanCedula)
  if (!diner) {
    throw new Error(`No se encontró ningún comensal con cédula ${cleanCedula}`)
  }

  const room = await biometricRepo.getDiningRoomDeviceById(diningRoomId)
  if (!room || !room.deviceIp || !room.deviceEnabled) {
    throw new Error(`El comedor #${diningRoomId} no tiene un terminal biométrico activo configurado`)
  }

  const device: HikvisionDeviceConfig = {
    diningRoomId: room.id,
    diningRoomName: room.name,
    ip: room.deviceIp,
    port: room.devicePort || 443,
    user: room.deviceUser || 'admin',
    password: room.devicePassword || '',
    enabled: room.deviceEnabled
  }

  const payload = `<CaptureFaceDataCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><captureInfrared>false</captureInfrared><dataType>binary</dataType></CaptureFaceDataCond>`

  const capRes = await executeIsapiRequest(
    device,
    '/ISAPI/AccessControl/CaptureFaceData',
    'POST',
    payload,
    'application/xml',
    timeoutMs
  )

  let photoBuffer: Buffer | null = null

  if (capRes.statusCode === 200 && capRes.buffer.length > 500) {
    if (capRes.buffer[0] === 0xFF && capRes.buffer[1] === 0xD8) {
      photoBuffer = capRes.buffer
    } else {
      const startIdx = capRes.buffer.indexOf(Buffer.from([0xFF, 0xD8]))
      const endIdx = capRes.buffer.lastIndexOf(Buffer.from([0xFF, 0xD9]))
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        photoBuffer = capRes.buffer.subarray(startIdx, endIdx + 2)
      }
    }
  }

  if (!photoBuffer) {
    throw new Error(`No se completó la captura en el terminal [HTTP ${capRes.statusCode}]`)
  }

  ensureStorageDirExists()
  const localFilePath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  fs.writeFileSync(localFilePath, photoBuffer)

  const enrollResult = await pushUserAndFaceToDevice(device, {
    cedula: cleanCedula,
    name: diner.name,
    photoBuffer
  })

  // Disparar auto-replicación multi-sede
  emitEvent('biometric:enrolled', {
    dinerId: diner.id,
    cedula: cleanCedula,
    sourceDeviceId: room.id
  })

  const fileSizeKB = Number((photoBuffer.length / 1024).toFixed(1))

  return {
    success: true,
    photoUrl: `/api/biometrics/face/${cleanCedula}?t=${Date.now()}`,
    cedula: cleanCedula,
    name: diner.name,
    fileSizeKB,
    enrolledInDevice: enrollResult.faceSuccess,
    timestamp: new Date()
  }
}

/**
 * Obtiene un frame instantáneo (snapshot JPEG) de la cámara en vivo del terminal.
 */
export async function getLiveCameraSnapshot(diningRoomId: number): Promise<LiveSnapshotResult> {
  const room = await biometricRepo.getDiningRoomDeviceById(diningRoomId)
  if (!room || !room.deviceIp || !room.deviceEnabled) {
    throw new Error(`El comedor #${diningRoomId} no tiene un terminal biométrico activo configurado`)
  }

  const device: HikvisionDeviceConfig = {
    diningRoomId: room.id,
    diningRoomName: room.name,
    ip: room.deviceIp,
    port: room.devicePort || 443,
    user: room.deviceUser || 'admin',
    password: room.devicePassword || '',
    enabled: room.deviceEnabled
  }

  const res = await executeIsapiRequest(device, '/ISAPI/Streaming/channels/101/picture', 'GET', undefined, '')
  if (res.statusCode !== 200 || res.buffer.length < 500) {
    throw new Error(`Fallo al capturar imagen del terminal ${device.diningRoomName} [HTTP ${res.statusCode}]`)
  }

  const base64 = res.buffer.toString('base64')
  const dataUrl = `data:image/jpeg;base64,${base64}`
  const fileSizeKB = Number((res.buffer.length / 1024).toFixed(1))

  return { dataUrl, fileSizeKB, timestamp: new Date() }
}

/**
 * Captura la foto en vivo del stream, la guarda en disco y la enrola.
 */
export async function captureAndEnrollDinerFace(
  diningRoomId: number,
  cedula: string
): Promise<RemoteCaptureResult> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) throw new Error('Cédula de comensal inválida')

  const diner = await biometricRepo.getDinerWithBiometricsByCedula(cleanCedula)
  if (!diner) throw new Error(`No se encontró ningún comensal con cédula ${cleanCedula}`)

  const room = await biometricRepo.getDiningRoomDeviceById(diningRoomId)
  if (!room || !room.deviceIp || !room.deviceEnabled) {
    throw new Error(`El comedor #${diningRoomId} no tiene un terminal biométrico activo configurado`)
  }

  const device: HikvisionDeviceConfig = {
    diningRoomId: room.id,
    diningRoomName: room.name,
    ip: room.deviceIp,
    port: room.devicePort || 443,
    user: room.deviceUser || 'admin',
    password: room.devicePassword || '',
    enabled: room.deviceEnabled
  }

  const picRes = await executeIsapiRequest(device, '/ISAPI/Streaming/channels/101/picture', 'GET', undefined, '')
  if (picRes.statusCode !== 200 || picRes.buffer.length < 500) {
    throw new Error(`No se pudo obtener la captura de la cámara [HTTP ${picRes.statusCode}]`)
  }

  ensureStorageDirExists()
  const localFilePath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  fs.writeFileSync(localFilePath, picRes.buffer)

  const enrollResult = await pushUserAndFaceToDevice(device, {
    cedula: cleanCedula,
    name: diner.name,
    photoBuffer: picRes.buffer
  })

  emitEvent('biometric:enrolled', {
    dinerId: diner.id,
    cedula: cleanCedula,
    sourceDeviceId: room.id
  })

  const fileSizeKB = Number((picRes.buffer.length / 1024).toFixed(1))

  return {
    success: true,
    photoUrl: `/api/biometrics/face/${cleanCedula}?t=${Date.now()}`,
    cedula: cleanCedula,
    name: diner.name,
    fileSizeKB,
    enrolledInDevice: enrollResult.faceSuccess,
    timestamp: new Date()
  }
}
