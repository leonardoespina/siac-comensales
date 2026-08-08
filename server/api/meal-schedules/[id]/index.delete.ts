import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import { mealScheduleService } from '../../../services/mealScheduleService'
import { getRouterParam } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'GLOBAL_ACCESS')
  
  const id = Number(getRouterParam(event, 'id'))
  
  return mealScheduleService.deleteSchedule(id)
})
