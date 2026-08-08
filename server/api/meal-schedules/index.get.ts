import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { mealScheduleService } from '../../services/mealScheduleService'

export default defineApiHandler(async (event) => {
  // Solo los que tengan acceso global pueden ver esta configuración sensible
  await requirePermission(event, 'GLOBAL_ACCESS')
  return mealScheduleService.getAllSchedules()
})
