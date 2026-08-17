/**
 * SERVICIO: Comensales (Orquestador)
 * 
 * REGLAS DE ARQUITECTURA:
 * - El puente entre el Dominio (reglas) y el Repositorio (BD).
 * - No conoce de HTTP (Requests, Responses).
 * - Dispara eventos del sistema (EventBus).
 */

import * as dinerRepo from '../repository/dinerRepository'
import { isLeadTimeValid } from '../domain/diners'
import { emitEvent } from '../utils/eventBus'

/**
 * Procesa la creación de una nueva solicitud masiva de comensales.
 * 
 * @param targetDate Fecha para la que se requiere la comida.
 * @param shiftType Turno requerido (DESAYUNO, ALMUERZO, etc).
 * @param supervisorId ID del usuario que solicita.
 * @param dinersList Array con los IDs de los comensales y su dieta.
 */
export async function submitDinerRequest(
  targetDate: Date, 
  shiftType: string, 
  supervisorId: number, 
  dinersList: Array<{ dinerId: number, rationType: string }>
) {
  const requestDate = new Date()

  // 1. Validaciones Puras de Dominio
  if (!isLeadTimeValid(requestDate, targetDate)) {
    throw new Error('ValidationError: Debe solicitar la comida con al menos 24 horas de anticipación.')
  }

  if (dinersList.length === 0) {
    throw new Error('ValidationError: La petición debe incluir al menos un comensal.')
  }

  // 2. Transacción de Base de Datos a través del Repositorio
  // Como no existirá flujo de aprobación manual, nacen APROBADAS automáticamente.
  const newRequest = await dinerRepo.createDinerRequest({
    date: targetDate,
    shiftType,
    createdById: supervisorId,
    approvedById: supervisorId,
    status: 'APPROVED',
    diners: dinersList
  })

  // 3. Emisión de Eventos Desacoplados
  // Esto permite que el archivo de notificaciones (eventListeners.ts) mande
  // un aviso a los aprobadores sin ensuciar el código de este servicio.
  emitEvent('dinerRequest:created', { 
    requestId: newRequest.id, 
    subdependencyId: newRequest.createdById // Para notificar al aprobador de la misma subdependencia
  })

  return newRequest
}

/**
 * Aprueba una petición existente.
 */
export async function approveDinerRequest(requestId: number, approverId: number) {
  // Validar si la petición existe y está pendiente
  const request = await dinerRepo.getRequestById(requestId)
  if (!request) {
    throw new Error('NotFoundError: La petición no existe.')
  }
  if (request.status !== 'PENDING') {
    throw new Error('StateError: La petición ya fue procesada.')
  }

  // Marcar como aprobada en DB
  const updatedRequest = await dinerRepo.updateRequestStatus(requestId, 'APPROVED', approverId)

  // Emitir evento para la cocina (Ej: "Preparen 50 platos más")
  emitEvent('dinerRequest:approved', { 
    requestId: updatedRequest.id,
    shiftType: updatedRequest.shiftType,
    date: updatedRequest.date
  })

  return updatedRequest
}

/**
 * Migra masivamente a un grupo de comensales a un nuevo comedor.
 * 
 * @param dinerIds Arreglo de IDs de los comensales a mover.
 * @param targetSiteId ID de la sede destino.
 */
export async function bulkMigrate(dinerIds: number[], targetSiteId: number) {
  if (!dinerIds || dinerIds.length === 0) {
    throw new Error('ValidationError: Debe proveer al menos un comensal para migrar.')
  }
  if (!targetSiteId) {
    throw new Error('ValidationError: Debe especificar una sede destino.')
  }

  // Delegar al repositorio la actualización masiva
  const result = await dinerRepo.updateSiteBulk(dinerIds, targetSiteId)
  
  // Emitir evento por si otros sistemas necesitan reaccionar
  emitEvent('diner:migratedBulk', { count: result.count, targetSiteId })

  return result
}

import { prisma } from '../utils/prisma'
import { ValidationError, ForbiddenError } from '../domain/errors'

export async function importDinersFromExcel(rows: Array<any>, user: any) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('No se enviaron datos válidos para procesar.')
  }

  // Sanitizar todas las cédulas antes de procesar
  rows.forEach(r => {
    if (r.cedula) {
      r.cedula = String(r.cedula).replace(/\D/g, '')
    }
  })

  const uniqueAreas = [...new Set(rows.map(r => r.areaName))]
  const uniquePositions = [...new Set(rows.filter(r => r.positionName).map(r => r.positionName))]
  const uniqueSquads = [...new Set(rows.map(r => r.squadName))]
  const uniqueSites = [...new Set(rows.map(r => r.sedeName || r.comedorName))]

  // A. Resolver Cargos (Positions)
  const positionMap = new Map<string, number>()
  for (const posName of uniquePositions) {
    const position = await prisma.position.findFirst({
      where: { name: { equals: posName as string, mode: 'insensitive' } }
    })
    if (!position) {
      throw new ValidationError(`El cargo '${posName}' no existe en el sistema. Debe crearlo primero.`)
    }
    positionMap.set((posName as string).toUpperCase(), position.id)
  }

  // B. Resolver Cuadrillas (Squads)
  const squadMap = new Map<string, number>()
  for (const sqName of uniqueSquads) {
    const squad = await prisma.squad.findFirst({
      where: { name: { equals: sqName as string, mode: 'insensitive' } }
    })
    if (!squad) {
      throw new ValidationError(`La cuadrilla '${sqName}' no existe en el sistema. Asegúrate de escribirla correctamente (ej: 'Administrativa', 'Cuadrilla A').`)
    }
    squadMap.set((sqName as string).toUpperCase(), squad.id)
  }

  // C. Resolver Áreas (Subdependencies) y Validar Permisos
  const areaMap = new Map<string, number>()
  for (const areaName of uniqueAreas) {
    if (!areaName) {
      throw new ValidationError(`La columna 'Área Destino' es obligatoria en todas las filas.`)
    }
    const subdep = await prisma.subdependency.findFirst({
      where: { name: { equals: areaName as string, mode: 'insensitive' } }
    })
    if (!subdep) {
      throw new ValidationError(`El área '${areaName}' no existe en el sistema. Asegúrate de escribirla correctamente.`)
    }

    // Validaciones de seguridad por cada área
    if (!user.isGlobal) {
      if (user.dependencyId && !user.subdependencyId) {
        // Gerente: el área debe pertenecer a su dependencia
        if (subdep.dependencyId !== user.dependencyId) {
          throw new ForbiddenError(`No tienes permiso para importar a '${areaName}' porque no pertenece a tu Gerencia.`)
        }
      } else if (user.subdependencyId) {
        // Usuario de área: solo puede importar a su propia área
        if (subdep.id !== user.subdependencyId) {
          throw new ForbiddenError(`Tu usuario solo puede importar trabajadores a tu propia área. Remueve los de '${areaName}'.`)
        }
      }
    }

    areaMap.set((areaName as string).toUpperCase(), subdep.id)
  }

  // D. Resolver Sedes (Sites)
  const siteMap = new Map<string, number>()
  for (const sName of uniqueSites) {
    if (!sName) {
      throw new ValidationError(`La columna Sede Base es obligatoria en todas las filas.`)
    }
    const site = await prisma.site.findFirst({
      where: { name: { equals: sName as string, mode: 'insensitive' } }
    })
    if (!site) {
      throw new ValidationError(`La sede '${sName}' no existe en el sistema. Asegúrate de escribirla correctamente.`)
    }
    siteMap.set((sName as string).toUpperCase(), site.id)
  }

  // 3. Procesar en lote (Upsert por cada trabajador)
  const results = await prisma.$transaction(async (tx) => {
    const processedDiners = []
    
    for (const row of rows) {
      const posId = row.positionName ? positionMap.get(String(row.positionName).toUpperCase()) : null
      const sqId = squadMap.get(String(row.squadName).toUpperCase())
      const sId = siteMap.get(String(row.sedeName || row.comedorName).toUpperCase())
      const subId = areaMap.get(String(row.areaName).toUpperCase())

      if (!sqId || !sId || !subId) continue // Salvaguarda

      const upsertedDiner = await tx.diner.upsert({
        where: { cedula: row.cedula },
        update: {
          name: row.name,
          rationType: row.rationType,
          squadId: sqId,
          subdependencyId: subId,
          siteId: sId,
          positionId: posId || null,
          active: true // Si estaba inactivo, el Excel lo revive
        },
        create: {
          cedula: row.cedula,
          name: row.name,
          rationType: row.rationType,
          squadId: sqId,
          subdependencyId: subId,
          siteId: sId,
          positionId: posId || null,
          active: true
        },
        include: {
          position: true,
          squad: true
        }
      })
      
      processedDiners.push(upsertedDiner)
    }
    return processedDiners
  })

  // 4. Emitir eventos WebSockets
  for (const diner of results) {
    emitEvent('diner:updated', { diner })
  }

  return results
}
