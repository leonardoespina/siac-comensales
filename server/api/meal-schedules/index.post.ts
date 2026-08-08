import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { mealScheduleService } from '../../services/mealScheduleService'
import { readBody, createError } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'GLOBAL_ACCESS')
  
  const body = await readBody(event)
  if (!body.shiftType || !body.startTime || !body.endTime) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan datos obligatorios' })
  }

  return mealScheduleService.createSchedule(body)
})
