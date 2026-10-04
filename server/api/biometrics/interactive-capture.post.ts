import { readBody, createError } from 'h3'
import { defineApiHandler } from '../../utils/handler'
import { triggerInteractiveDeviceFaceCapture } from '../../services/hikvision'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const diningRoomId = Number(body?.diningRoomId)
  const cedula = String(body?.cedula || '').trim()
  
  if (!diningRoomId || !cedula) {
    throw createError({ statusCode: 400, statusMessage: 'diningRoomId y cedula son obligatorios' })
  }

  return await triggerInteractiveDeviceFaceCapture(diningRoomId, cedula)
})
