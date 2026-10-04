/**
 * HANDLER: Captura Instantánea de Cámara en Vivo (Snapshot)
 *
 * Ruta: GET /api/biometrics/snapshot?diningRoomId=1
 * Devuelve un frame en formato base64 JPEG del terminal Hikvision solicitado.
 *
 * CAPA 4 — Adaptador HTTP. Sin lógica de negocio.
 */

import { getQuery, createError } from 'h3'
import { defineApiHandler } from '../../utils/handler'
import { getLiveCameraSnapshot } from '../../services/hikvisionService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const diningRoomId = Number(query.diningRoomId)

  if (!diningRoomId || isNaN(diningRoomId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El parámetro diningRoomId es obligatorio y debe ser numérico'
    })
  }

  return await getLiveCameraSnapshot(diningRoomId)
})
