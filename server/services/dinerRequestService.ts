import { dinerRequestRepository } from '../repository/dinerRequestRepository'
import { settingService } from './settingService'
import { createError } from 'h3'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

// Forzamos la zona horaria del servidor para todas las validaciones matemáticas
const TZ = process.env.TZ || 'America/Caracas'

export const dinerRequestService = {
  
  /**
   * MOTOR DE VALIDACIÓN DE TIEMPO (CUTOFF ENGINE)
   * Verifica si la operación sobre la `targetDate` está dentro del límite de tiempo.
   * Lanza un Error 403 si la barrera de tiempo fue violada.
   */
  async validateTimeRule(targetDate: Date, isExtraordinary: boolean, hasManagerBypass: boolean) {
    // 1. Regla de Oro: Las visitas extraordinarias saltan la barrera de tiempo inmediatamente.
    if (isExtraordinary) return true

    // 2. Bypass de Emergencia: Si es Gerente de Comedor, salta la barrera.
    if (hasManagerBypass) return true

    // Obtener parámetros dinámicos de la BD
    const minDaysAhead = await settingService.getMinDaysAhead()
    const cutoffTime = await settingService.getCutoffTime() // { hours: 10, minutes: 30 }

    // Fecha actual estricta en Caracas
    const now = dayjs().tz(TZ)
    
    // Convertimos la fecha objetivo (targetDate) a un objeto Dayjs en Caracas para cálculos precisos
    // Asumimos que targetDate viene como Date puro (UTC) representando la medianoche del día del servicio.
    const serviceDate = dayjs(targetDate).tz(TZ).startOf('day')

    // Calculamos cuántos días de diferencia hay entre "hoy" y "el día del servicio"
    // Usamos startOf('day') para que la diferencia sea de días calendario limpios.
    const diffDays = serviceDate.diff(now.startOf('day'), 'day')

    // REGLA A: Anticipación mínima
    // Si diffDays < minDaysAhead (ej. pidiendo para hoy y min=1), rechazar directamente.
    if (diffDays < minDaysAhead) {
      throw createError({ 
        statusCode: 403, 
        statusMessage: `Las solicitudes regulares deben hacerse con al menos ${minDaysAhead} día(s) de anticipación.` 
      })
    }

    // REGLA B: La Hora de Cierre (Cutoff Time) del día límite
    // Si diffDays == minDaysAhead, significa que estamos exactamente en el "día previo límite".
    // En este caso, no podemos haber pasado la hora límite (ej. 10:30 AM).
    if (diffDays === minDaysAhead) {
      const currentHour = now.hour()
      const currentMinute = now.minute()
      
      const isPastCutoff = (currentHour > cutoffTime.hours) || 
                           (currentHour === cutoffTime.hours && currentMinute >= cutoffTime.minutes)

      if (isPastCutoff) {
        throw createError({ 
          statusCode: 403, 
          statusMessage: `El tiempo límite para modificar esta solicitud venció a las ${cutoffTime.hours}:${cutoffTime.minutes < 10 ? '0' : ''}${cutoffTime.minutes} del día previo.` 
        })
      }
    }

    return true
  },

  async getRequestsByDateRange(startDateStr: string, endDateStr: string) {
    const start = dayjs.tz(startDateStr, TZ).startOf('day').toDate()
    const end = dayjs.tz(endDateStr, TZ).endOf('day').toDate()
    return dinerRequestRepository.findAllByDateRange(start, end)
  },

  async createRequests(data: { dates: string[]; shiftType: string; isExtraordinary: boolean; diningRoomId: number; dinerIds: number[] }, userId: number, hasManagerBypass: boolean) {
    if (data.dinerIds.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Debe seleccionar al menos un comensal.' })
    }
    
    const createdRequests = []
    
    // Generamos un Código de Lote Único
    const batchCode = `REQ-${dayjs().format('YYMMDD')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Para operaciones multifecha (rango), iteramos por cada día seleccionado
    for (const dateStr of data.dates) {
      const targetDate = dayjs.tz(dateStr, TZ).startOf('day').toDate()
      
      // 1. Validar la regla de tiempo para cada día
      await this.validateTimeRule(targetDate, data.isExtraordinary, hasManagerBypass)

      // 1.5 Validar Anti-Duplicados (Solapamiento)
      const overlaps = await dinerRequestRepository.findOverlappingDiners(targetDate, data.shiftType, data.dinerIds)
      
      if (overlaps.length > 0) {
        const names = overlaps.map(o => o.diner.name).join(', ')
        throw createError({
          statusCode: 409,
          statusMessage: `Conflicto: Los siguientes comensales ya tienen solicitud para el ${dateStr} (${data.shiftType}): ${names}`
        })
      }

      // 2. Crear la solicitud transaccional en el Repositorio
      const req = await dinerRequestRepository.createWithDetails({
        date: targetDate,
        shiftType: data.shiftType,
        status: data.isExtraordinary ? 'APPROVED' : 'PENDING',
        batchCode: batchCode,
        isExtraordinary: data.isExtraordinary,
        createdById: userId,
        diningRoomId: data.diningRoomId || null
      } as any, data.dinerIds)

      createdRequests.push(req)
    }

    return createdRequests
  },

  async deleteRequest(id: number, targetDate: Date, isExtraordinary: boolean, hasManagerBypass: boolean) {
    // Para dar de baja, también debemos verificar el Cutoff
    await this.validateTimeRule(targetDate, isExtraordinary, hasManagerBypass)
    return dinerRequestRepository.deleteWithDetails(id)
  }
}
