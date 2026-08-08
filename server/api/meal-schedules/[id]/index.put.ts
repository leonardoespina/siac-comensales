import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import { mealScheduleService } from '../../../services/mealScheduleService'
import { readBody, getRouterParam } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'GLOBAL_ACCESS')
  
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  
  return mealScheduleService.updateSchedule(id, body)
})
