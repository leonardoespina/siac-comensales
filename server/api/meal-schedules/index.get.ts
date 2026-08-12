import { defineApiHandler } from '../../utils/handler'
import { mealScheduleService } from '../../services/mealScheduleService'

export default defineApiHandler(async (event) => {
  // Los catálogos de turnos son necesarios para todos los usuarios que hacen solicitudes
  return mealScheduleService.getAllSchedules()
})
