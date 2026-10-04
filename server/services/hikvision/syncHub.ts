/**
 * SUB-SERVICIO: Orquestación de Sincronización Multi-Sede (Hub-and-Spoke)
 * 
 * RESPONSABILIDAD:
 * - Replicación de usuarios, fotos y huellas hacia todos los comedores activos.
 * - Limpieza y purga centralizada de biometría en terminales, disco y BD.
 */

import fs from 'fs'
import path from 'path'
import {
  HikvisionDeviceConfig,
  HikvisionFingerprintItem,
  BiometricSyncResult,
  BiometricSyncTarget,
  BiometricDeleteResult,
  BiometricDeleteTarget,
  sanitizeEmployeeNo
} from '../../domain/biometrics'
import * as biometricRepo from '../../repository/biometricRepository'
import {
  STORAGE_FACES_DIR,
  ensureStorageDirExists,
  fetchAndStoreFaceFromDevice,
  pushUserAndFaceToDevice,
  deleteFaceFromDevice
} from './face'
import { fetchFingerprintFromDevice, pushFingerprintToDevice } from './fingerprint'
import { deleteUserFromDevice } from './user'
import { emitEvent } from '../../utils/eventBus'

const syncingDiners = new Set<string>()

/**
 * Sincroniza un comensal hacia todos los comedores activos del sistema.
 */
export async function syncDinerAcrossAllTerminals(dinerId: number): Promise<BiometricSyncResult> {
  const diner = await biometricRepo.getDinerWithBiometricsById(dinerId)
  if (!diner) {
    throw new Error(`Comensal con ID ${dinerId} no encontrado`)
  }

  const cleanCedula = sanitizeEmployeeNo(diner.cedula)
  const diningRooms = await biometricRepo.listActiveBiometricDiningRooms()

  ensureStorageDirExists()
  const localPhotoPath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  let photoBuffer: Buffer | null = null

  if (fs.existsSync(localPhotoPath)) {
    photoBuffer = fs.readFileSync(localPhotoPath)
  }

  let fpItem: HikvisionFingerprintItem | null = null
  if (diner.biometricRecord?.templates?.length) {
    fpItem = {
      cardReaderNo: 1,
      fingerPrintID: 1,
      fingerType: 'normalFP',
      fingerData: diner.biometricRecord.templates[0]
    }
  }

  // Si falta foto o huella, interrogar a los terminales activos
  if (!photoBuffer || !fpItem) {
    for (const room of diningRooms) {
      if (!room.deviceIp) continue
      const devConfig: HikvisionDeviceConfig = {
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }

      if (!photoBuffer) {
        const savedPath = await fetchAndStoreFaceFromDevice(devConfig, cleanCedula)
        if (savedPath && fs.existsSync(localPhotoPath)) {
          photoBuffer = fs.readFileSync(localPhotoPath)
        }
      }

      if (!fpItem) {
        const foundFp = await fetchFingerprintFromDevice(devConfig, cleanCedula)
        if (foundFp) {
          fpItem = foundFp
        }
      }

      if (photoBuffer && fpItem) break
    }
  }

  // Replicar hacia todos los comedores activos
  const targets: BiometricSyncTarget[] = []

  for (const room of diningRooms) {
    if (!room.deviceIp) continue
    const devConfig: HikvisionDeviceConfig = {
      diningRoomId: room.id,
      diningRoomName: room.name,
      ip: room.deviceIp,
      port: room.devicePort || 443,
      user: room.deviceUser || 'admin',
      password: room.devicePassword || '',
      enabled: room.deviceEnabled
    }

    try {
      const result = await pushUserAndFaceToDevice(devConfig, {
        cedula: cleanCedula,
        name: diner.name,
        photoBuffer
      })

      let fpSuccess = false
      if (fpItem && result.userSuccess) {
        const fpRes = await pushFingerprintToDevice(devConfig, {
          cedula: cleanCedula,
          fpItem
        })
        fpSuccess = fpRes.success
      }

      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        userSuccess: result.userSuccess,
        faceSuccess: result.faceSuccess,
        fpSuccess,
        error: result.error
      })
    } catch (err: any) {
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        userSuccess: false,
        faceSuccess: false,
        fpSuccess: false,
        error: err.message
      })
    }
  }

  const totalSuccess = targets.length > 0 && targets.every(t => t.userSuccess)

  emitEvent('biometric:synced', {
    dinerId: diner.id,
    cedula: cleanCedula,
    name: diner.name,
    targets,
    timestamp: new Date()
  })

  return {
    dinerId: diner.id,
    cedula: cleanCedula,
    name: diner.name,
    targets,
    fpSynced: !!fpItem,
    totalSuccess
  }
}

/**
 * Purga y resetea las credenciales biométricas de un comensal en todos los terminales.
 */
export async function clearDinerBiometricsAcrossAllTerminals(dinerId: number): Promise<BiometricDeleteResult> {
  const diner = await biometricRepo.getDinerWithBiometricsById(dinerId)
  if (!diner) {
    throw new Error(`Comensal con ID ${dinerId} no encontrado`)
  }

  const cleanCedula = sanitizeEmployeeNo(diner.cedula)
  const diningRooms = await biometricRepo.listActiveBiometricDiningRooms()
  const targets: BiometricDeleteTarget[] = []

  for (const room of diningRooms) {
    if (!room.deviceIp) continue
    const devConfig: HikvisionDeviceConfig = {
      diningRoomId: room.id,
      diningRoomName: room.name,
      ip: room.deviceIp,
      port: room.devicePort || 443,
      user: room.deviceUser || 'admin',
      password: room.devicePassword || '',
      enabled: room.deviceEnabled
    }

    try {
      await deleteFaceFromDevice(devConfig, cleanCedula)
      const userRes = await deleteUserFromDevice(devConfig, cleanCedula)
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        success: userRes.success,
        error: userRes.error
      })
    } catch (err: any) {
      targets.push({
        diningRoomId: room.id,
        diningRoomName: room.name,
        success: false,
        error: err.message
      })
    }
  }

  // Eliminar foto local en disco
  const localPhotoPath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  let diskCleared = false
  if (fs.existsSync(localPhotoPath)) {
    try {
      fs.unlinkSync(localPhotoPath)
      diskCleared = true
    } catch {
      diskCleared = false
    }
  } else {
    diskCleared = true
  }

  // Limpiar templates en Base de Datos
  let dbCleared = false
  try {
    await biometricRepo.upsertBiometricRecord(diner.id, [], true)
    dbCleared = true
  } catch {
    dbCleared = false
  }

  return {
    dinerId: diner.id,
    cedula: cleanCedula,
    targets,
    diskCleared,
    dbCleared,
    totalSuccess: diskCleared && dbCleared
  }
}
