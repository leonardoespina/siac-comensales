/**
 * SUB-SERVICIO: Recepción y Registro de Rostro Facial Subido (Edge / Manual)
 * 
 * RESPONSABILIDAD:
 * - Valida y persiste la foto facial JPEG recibida.
 * - Registra la foto en disco y emite evento de sincronización multi-sede.
 */

import fs from 'fs'
import path from 'path'
import { sanitizeEmployeeNo } from '../../domain/biometrics'
import { ValidationError, NotFoundError } from '../../domain/errors'
import * as biometricRepo from '../../repository/biometricRepository'
import { emitEvent } from '../../utils/eventBus'
import { STORAGE_FACES_DIR, ensureStorageDirExists } from './face'

export interface UploadFaceResult {
  success: boolean
  photoUrl: string
  cedula: string
  name: string
  fileSizeKB: number
  timestamp: Date
}

export async function processUploadedFace(
  cedula: string,
  photoBase64: string,
  sourceDeviceId?: number
): Promise<UploadFaceResult> {
  const cleanCedula = sanitizeEmployeeNo(cedula)
  if (!cleanCedula) {
    throw new ValidationError(['Cédula de comensal inválida'])
  }

  if (!photoBase64 || typeof photoBase64 !== 'string') {
    throw new ValidationError(['Foto facial en formato base64 requerida'])
  }

  const diner = await biometricRepo.getDinerWithBiometricsByCedula(cleanCedula)
  if (!diner) {
    throw new NotFoundError('Comensal', cleanCedula)
  }

  // Limpiar prefijo data URI si viene incluido
  const pureBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(pureBase64, 'base64')

  if (buffer.length < 500) {
    throw new ValidationError(['El archivo de imagen facial es demasiado pequeño o inválido'])
  }

  // Verificar firma JPEG (0xFF, 0xD8)
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    throw new ValidationError(['El archivo subido no es una imagen JPEG válida'])
  }

  ensureStorageDirExists()
  const localFilePath = path.join(STORAGE_FACES_DIR, `${cleanCedula}.jpg`)
  fs.writeFileSync(localFilePath, buffer)

  // Disparar auto-replicación multi-sede (hacia los terminales que sí tengan conexión)
  emitEvent('biometric:enrolled', {
    dinerId: diner.id,
    cedula: cleanCedula,
    sourceDeviceId: sourceDeviceId || undefined
  })

  const fileSizeKB = Number((buffer.length / 1024).toFixed(1))

  return {
    success: true,
    photoUrl: `/api/biometrics/face/${cleanCedula}?t=${Date.now()}`,
    cedula: cleanCedula,
    name: diner.name,
    fileSizeKB,
    timestamp: new Date()
  }
}
