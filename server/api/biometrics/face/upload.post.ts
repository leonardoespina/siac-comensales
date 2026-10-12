/**
 * HANDLER: Subida y Enrolamiento Facial (Edge / Bypass)
 * 
 * Ruta: POST /api/biometrics/face/upload
 * Recibe foto en base64 de un comensal desde el Edge Agent o cliente local.
 */

import { readBody } from 'h3'
import { defineApiHandler } from '../../../utils/handler'
import { processUploadedFace } from '../../../services/hikvision'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const cedula = String(body?.cedula || '').trim()
  const photoBase64 = String(body?.photoBase64 || '').trim()
  const sourceDeviceId = body?.diningRoomId ? Number(body.diningRoomId) : undefined

  if (!cedula || !photoBase64) {
    throw new ValidationError(['cedula y photoBase64 son obligatorios'])
  }

  return await processUploadedFace(cedula, photoBase64, sourceDeviceId)
})
