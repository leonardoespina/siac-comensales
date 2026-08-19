import { dinerRequestRepository } from '../repository/dinerRequestRepository'
import * as dinerRepository from '../repository/dinerRepository'
import * as dependencyRepository from '../repository/dependencyRepository'
import { settingService } from './settingService'
import { DomainError } from '../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import crypto from 'crypto'
import { prisma } from '../utils/prisma'

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
  async validateTimeRule(targetDateStr: string, action: 'CREATE' | 'UPDATE_GENERAL' | 'DELETE' | 'EMERGENCY_ROOM_CHANGE', hasGlobalBypass: boolean) {
    // Desactivamos el Bypass del .env porque Nuxt está cacheando 'true' persistentemente
    // if (config.public.testBypassTimeRules) return true
    
    // Bypass Exclusivo para Administrador Global
    if (hasGlobalBypass) return true

    // Obtener configuraciones globales dinámicamente
    const minDaysAhead = await settingService.getMinDaysAhead()
    const cutoff = await settingService.getCutoffTime() // Formato militar 24h

    // Inyectamos la Máquina del Tiempo para testing
    const now = process.env.MOCK_TIME ? dayjs(process.env.MOCK_TIME).tz(TZ) : dayjs().tz(TZ)
    const targetDate = dayjs.tz(targetDateStr, TZ).startOf('day')
    const diffDays = targetDate.diff(now.startOf('day'), 'day')

    // Lógica para formatear la hora en am/pm para los mensajes de error
    const formattedCutoff = dayjs().hour(cutoff.hours).minute(cutoff.minutes).format('hh:mm A')

    if (action === 'CREATE' || action === 'UPDATE_GENERAL' || action === 'DELETE') {
      // Regla estricta: Únicamente el día siguiente a la fecha actual (1 día de anticipación)
      if (diffDays !== minDaysAhead) {
        throw new DomainError(
          `Las solicitudes o sus modificaciones generales solo pueden hacerse para exactamente ${minDaysAhead} día(s) siguiente(s). (Diferencia actual: ${diffDays} días)`,
          'TIME_RULE_VIOLATION',
          403
        )
      }
      
      // La regla de corte: Hasta la hora límite configurada del día previo.
      if (now.hour() > cutoff.hours || (now.hour() === cutoff.hours && now.minute() >= cutoff.minutes)) {
        throw new DomainError(
          `El tiempo límite para crear, editar o anular solicitudes venció a las ${formattedCutoff} del día previo.`,
          'TIME_RULE_VIOLATION',
          403
        )
      }
    } else if (action === 'EMERGENCY_ROOM_CHANGE') {
      // Excepción por emergencia: Cambio de comedor de destino.
      // Permitido desde la noche previa (diffDays === minDaysAhead) 
      // hasta las 10:00 a.m. del mismo día de consumo (diffDays === 0).
      if (diffDays === minDaysAhead) {
        // Permitido libremente si estamos en la noche previa
        return true
      } else if (diffDays === 0) {
        // Si ya estamos en la mañana del consumo, límite 10:00 a.m.
        if (now.hour() >= 10) {
          throw new DomainError(
            `El tiempo límite para emergencias (cambio de comedor) venció a las 10:00 a.m. del día de consumo.`,
            'TIME_RULE_VIOLATION',
            403
          )
        }
      } else {
        throw new DomainError(
          `Las excepciones de cambio de comedor solo pueden hacerse desde la noche previa hasta la mañana del consumo.`,
          'TIME_RULE_VIOLATION',
          403
        )
      }
    }

    return true
  },

  async getRequestsByDateRange(startDateStr: string, endDateStr: string, dependencyId?: number | null, subdependencyId?: number | null, isAdmin: boolean = false) {
    const start = new Date(`${startDateStr}T00:00:00.000Z`)
    const end = new Date(`${endDateStr}T00:00:00.000Z`)
    return dinerRequestRepository.findAllByDateRange(start, end, dependencyId, subdependencyId, isAdmin)
  },

  async createRequests(data: { 
    dates: string[], 
    shiftType: string, 
    targetSubdependencyId?: number,
    diningRoomId?: number, 
    diners: any[],
    batchCode?: string
  }, userId: number, hasGlobalBypass: boolean, skipTimeValidation: boolean = false) {
    if (data.diners.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Debe seleccionar al menos un comensal.' })
    }

    const hasBulk = data.diners.some(d => d.quantity && d.quantity > 1)
    if (hasBulk) {
      if (!data.targetSubdependencyId) {
        throw createError({ statusCode: 403, statusMessage: 'Se requiere especificar la subdependencia destino para solicitudes masivas.' })
      }
      const targetSubdep = await dependencyRepository.getSubdependencyById(data.targetSubdependencyId)
      if (!targetSubdep || !targetSubdep.allowsBulkRequests) {
        throw createError({ statusCode: 403, statusMessage: 'La subdependencia seleccionada no permite solicitudes masivas.' })
      }
    }
    
    const createdRequests = []
    
    // Generamos o reutilizamos el Código de Lote Único
    const batchCode = data.batchCode || `REQ-${dayjs().format('YYMMDD')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Para operaciones multifecha (rango), iteramos por cada día seleccionado
    for (const dateStr of data.dates) {
      // Usamos UTC estricto a la medianoche para alinear con Postgres @db.Date y evitar duplicados
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`)
      
      // Validar regla de tiempo solo si no se ha omitido (Ej: en edición ya se validó)
      if (!skipTimeValidation) {
        await this.validateTimeRule(dateStr, 'CREATE', hasGlobalBypass)
      }

      // 1.5 Validar Anti-Duplicados (Solapamiento)
      // Extraemos solo los comensales que van a tener una comida individual (DINE_IN).
      // Si la modalidad es TAKE_AWAY (masivo), saltamos la validación porque son solo mensajeros
      const dineInDiners = data.diners.filter(d => d.modality !== 'TAKE_AWAY')
      
      if (dineInDiners.length > 0) {
        const dinerIds = dineInDiners.map(d => d.id)
        const overlaps = await dinerRequestRepository.findOverlappingDiners(targetDate, data.shiftType, dinerIds)
        
        if (overlaps.length > 0) {
          const names = overlaps.map(o => o.diner.name).join(', ')
          throw createError({
            statusCode: 409,
            statusMessage: `Conflicto: Los siguientes comensales ya tienen su comida individual (o están duplicados) para el ${dateStr} (${data.shiftType}): ${names}`
          })
        }
      }

      const req = await dinerRequestRepository.createWithDetails({
        date: targetDate,
        shiftType: data.shiftType,
        status: 'APPROVED',
        batchCode: batchCode,
        createdById: userId,
        approvedById: userId,
        diningRoomId: data.diningRoomId || null,
        targetSubdependencyId: data.targetSubdependencyId || null
      } as any, data.diners)

      createdRequests.push(req)
    }

    return createdRequests
  },

  async deleteRequest(id: number, targetDate: Date, hasGlobalBypass: boolean) {
    // Para dar de baja, también debemos verificar el Cutoff
    // Convertimos el objeto Date de DB devuelta a string para validar
    const dateStr = targetDate.toISOString().split('T')[0]
    
    // Validar tiempo de corte (solo elimina el día previo)
    await this.validateTimeRule(dateStr, 'DELETE', hasGlobalBypass)
    return dinerRequestRepository.deleteWithDetails(id)
  },

  async deleteRequestsBulk(ids: number[], hasGlobalBypass: boolean) {
    const requests = await dinerRequestRepository.findManyByIds(ids)
    if (requests.length === 0) return { count: 0 }

    // Validar tiempo de cierre para todas las solicitudes
    for (const req of requests) {
      const dateStr = req.date.toISOString().split('T')[0]
      await this.validateTimeRule(dateStr, 'DELETE', hasGlobalBypass)
    }

    return dinerRequestRepository.deleteManyWithDetails(ids)
  },

  async updateRequestBatch(batchOrId: string, data: { 
    dates: string[], 
    targetSubdependencyId?: number,
    diningRoomId?: number, 
    shifts: { shiftType: string, diners: any[] }[]
  }, userId: number, hasGlobalBypass: boolean) {
    if (!data.shifts || data.shifts.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Debe seleccionar al menos un comensal en algún turno.' })
    }

    let requestsToUpdate: any[] = []
    if (batchOrId.startsWith('SINGLE-')) {
      const id = parseInt(batchOrId.replace('SINGLE-', ''))
      const req = await prisma.dinerRequest.findUnique({
        where: { id },
        include: { details: true }
      })
      if (req) requestsToUpdate.push(req)
    } else {
      console.log(`[updateRequestBatch] Buscando batchCode: ${batchOrId}`)
      requestsToUpdate = await prisma.dinerRequest.findMany({
        where: { batchCode: batchOrId, deletedAt: null },
        include: { details: true }
      })
      console.log(`[updateRequestBatch] Encontrados activos: ${requestsToUpdate.length}`)
      
      if (requestsToUpdate.length === 0) {
        // Buscar para ver si está borrado
        const allWithBatch = await prisma.dinerRequest.findMany({
          where: { batchCode: batchOrId }
        })
        console.log(`[updateRequestBatch] Encontrados (incluyendo borrados): ${allWithBatch.length}`)
      }
    }

    if (requestsToUpdate.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'No se encontraron solicitudes válidas para actualizar.' })
    }

    // Determinar si es una edición completa o solo un cambio de comedor de emergencia.
    // Lo verificamos comprobando si la cantidad de comensales y turnos se mantuvo idéntica.
    const existingDinersCount = requestsToUpdate.reduce((acc, req) => acc + req.details.length, 0)
    const incomingDinersCount = data.shifts.reduce((acc, shift) => acc + shift.diners.length, 0)
    
    console.log(`[DEBUG] EMERGENCY CHANGE EVAL: existing=${existingDinersCount}, incoming=${incomingDinersCount}`)
    
    // Si la cantidad de personas comerá es la misma, se asume que solo están redireccionando el comedor.
    const isOnlyRoomChange = existingDinersCount === incomingDinersCount
    const actionType = isOnlyRoomChange ? 'EMERGENCY_ROOM_CHANGE' : 'UPDATE_GENERAL'

    // Validar políticas de tiempo
    for (const req of requestsToUpdate) {
      const dateStr = req.date.toISOString().split('T')[0]
      await this.validateTimeRule(dateStr, actionType, hasGlobalBypass)
    }

    // Para la edición, borramos las requests anteriores (Soft Delete) y las recreamos con los nuevos datos 
    // pero manteniendo el batchCode. Esto asegura que la auditoría quede limpia y la lógica de comensales masivos sea segura.
    const idsToDelete = requestsToUpdate.map(r => r.id)
    await dinerRequestRepository.deleteManyWithDetails(idsToDelete)

    const results = []
    
    // Almacenamos el batchCode original para asegurar que la re-creación mantenga todo enlazado
    const actualBatchCode = requestsToUpdate[0].batchCode
    
    try {
      for (const shift of data.shifts) {
        // Agrupar los comensales de este turno por su comedor individual
        const groupsByDiningRoom: Record<string, any[]> = {}
        
        for (const diner of shift.diners) {
          // Usa el comedor individual del comensal. Si no lo tiene, usa el comedor global de la petición.
          const dRoomId = diner.diningRoomId || data.diningRoomId || 'null'
          if (!groupsByDiningRoom[dRoomId]) groupsByDiningRoom[dRoomId] = []
          groupsByDiningRoom[dRoomId].push(diner)
        }
        
        for (const dRoomIdStr of Object.keys(groupsByDiningRoom)) {
          const dinersInGroup = groupsByDiningRoom[dRoomIdStr]
          const finalDiningRoomId = dRoomIdStr !== 'null' ? parseInt(dRoomIdStr) : undefined
          
          const res = await this.createRequests({
            dates: data.dates,
            shiftType: shift.shiftType,
            targetSubdependencyId: data.targetSubdependencyId,
            diningRoomId: finalDiningRoomId,
            diners: dinersInGroup,
            batchCode: actualBatchCode || undefined
          }, userId, hasGlobalBypass, true) // skipTimeValidation = true
          results.push(res)
        }
      }
    } catch (error) {
      // ROLLBACK MÁGICO: Restaurar los eliminados si la creación falla (ej. validaciones de duplicados)
      await prisma.dinerRequest.updateMany({
        where: { id: { in: idsToDelete } },
        data: { deletedAt: null }
      })
      throw error // Relanzar el error para que la UI lo muestre
    }
    
    return results
  }
}
