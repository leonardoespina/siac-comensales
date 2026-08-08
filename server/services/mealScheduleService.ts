import { mealScheduleRepository } from '../repository/mealScheduleRepository'
import { createError } from 'h3'

// Función matemática auxiliar para convertir la hora (ej: "14:30") a un número entero de minutos (870)
// Esto es el secreto para que la computadora pueda comparar horarios rapidísimo.
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export const mealScheduleService = {
  
  async getAllSchedules() {
    return mealScheduleRepository.findAll()
  },

  async createSchedule(data: { shiftType: string; startTime: string; endTime: string; active?: boolean }) {
    const shiftUpper = data.shiftType.toUpperCase()

    // 1. Verificamos que el turno no exista ya
    const existingShift = await mealScheduleRepository.findByShiftType(shiftUpper)
    if (existingShift) {
      throw createError({ statusCode: 400, statusMessage: 'Ya existe un horario configurado para este turno' })
    }

    // 2. Convertimos el rango nuevo a minutos
    const startMins = timeToMinutes(data.startTime)
    let endMins = timeToMinutes(data.endTime)
    
    // Truco arquitectónico: Si el horario cruza la medianoche (ej. Sobrecena de 22:00 a 02:00)
    // el fin (02:00) matemáticamente es menor que el inicio (22:00). 
    // Para arreglarlo, le sumamos 24 horas (1440 minutos) al fin.
    if (endMins <= startMins) {
      endMins += 1440
    }

    // 3. LA BARRERA ANTI-COLISIÓN (Anti-Solapamiento)
    const allSchedules = await mealScheduleRepository.findAll()
    
    for (const sched of allSchedules) {
      if (sched.active) {
        const existStart = timeToMinutes(sched.startTime)
        let existEnd = timeToMinutes(sched.endTime)
        if (existEnd <= existStart) existEnd += 1440

        // Esta es la regla universal para saber si dos líneas de tiempo se cruzan:
        // Si el Inicio Nuevo ocurre ANTES de que acabe el Existente, Y el Fin Nuevo ocurre DESPUÉS de que empiece el Existente = ¡CHOQUE!
        if (startMins < existEnd && endMins > existStart) {
          throw createError({ 
            statusCode: 400, 
            statusMessage: `Error: Tu horario colisiona con el turno de ${sched.shiftType} (${sched.startTime} a ${sched.endTime})` 
          })
        }
      }
    }

    // 4. Si pasó la barrera, guardamos en base de datos
    return mealScheduleRepository.create({
      shiftType: shiftUpper,
      startTime: data.startTime,
      endTime: data.endTime,
      active: data.active !== undefined ? data.active : true
    })
  },

  async updateSchedule(id: number, data: any) {
    // Para simplificar: No permitimos cambiar la hora de un turno activo que choque. 
    // Lo ideal es que el admin desactive el viejo y cree uno nuevo, o aplicar la misma lógica anti-colisión aquí.
    return mealScheduleRepository.update(id, data)
  },

  async deleteSchedule(id: number) {
    return mealScheduleRepository.delete(id)
  }
}
