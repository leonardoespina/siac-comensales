/**
 * HANDLER: Captura y Enrolamiento Facial Remoto
 *
 * Ruta: POST /api/biometrics/remote-capture
 * Toma la foto del terminal, la guarda en disco y la inyecta como rostro oficial.
 *
 * CAPA 4 — Adaptador HTTP. Sin lógica de negocio.
 */

import { readBody, createError } from 'h3'
import { defineApiHandler } from '../../utils/handler'
import { captureAndEnrollDinerFace } from '../../services/hikvisionService'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)

  const diningRoomId = Number(body?.diningRoomId)
  const cedula = String(body?.cedula || '').trim()

  if (!diningRoomId || isNaN(diningRoomId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El parámetro diningRoomId es requerido y debe ser numérico'
    })
  }

  if (!cedula) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La cédula del comensal es requerida'
    })
  }

  return await captureAndEnrollDinerFace(diningRoomId, cedula)
})
