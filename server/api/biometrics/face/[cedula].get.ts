/**
 * HANDLER: Servir Foto Facial de Comensal
 * 
 * Ruta: GET /api/biometrics/face/:cedula
 * Devuelve el archivo JPG binario del rostro del comensal.
 */

import fs from 'fs'
import path from 'path'
import { setHeader, createError } from 'h3'
import { sanitizeEmployeeNo } from '../../../domain/biometrics'

export default defineEventHandler(async (event) => {
  const rawCedula = event.context.params?.cedula || ''
  const cleanCedula = sanitizeEmployeeNo(rawCedula)

  if (!cleanCedula) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cédula inválida'
    })
  }

  const filePath = path.join(process.cwd(), 'storage', 'biometrics', 'faces', `${cleanCedula}.jpg`)

  if (!fs.existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Foto de rostro no encontrada'
    })
  }

  const fileBuffer = fs.readFileSync(filePath)

  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
  setHeader(event, 'Content-Length', fileBuffer.length)

  return fileBuffer
})
