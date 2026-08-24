import { defineApiHandler } from '../../utils/handler'
import { mealScheduleService } from '../../services/mealScheduleService'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  // Los catálogos de turnos son necesarios para todos los usuarios que hacen solicitudes
  return mealScheduleService.getAllSchedules()
})
