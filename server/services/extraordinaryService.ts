import * as extraordinaryRepo from '../repository/extraordinaryRepository'
import { logAudit } from '../utils/audit'
import { validateExtraordinaryDispatch } from '../domain/extraordinary'
import { DomainError } from '../domain/errors'

function checkExtraordinaryAccess(record: any, userContext: any) {
  if (!userContext || userContext.isGlobal) return
  const userSubIds: number[] = userContext.subdependencyIds || (userContext.subdependencyId ? [userContext.subdependencyId] : [])

  if (record.dispatchedById === userContext.id) return

  if (userSubIds.length > 0) {
    if (record.subdependencyId && userSubIds.includes(record.subdependencyId)) return
    throw new DomainError('No tienes permisos sobre visitas extraordinarias de otra subdependencia.', 'FORBIDDEN', 403)
  }

  if (userContext.dependencyId) {
    const recordDepId = record.dependencyId || record.subdependency?.dependencyId
    if (recordDepId === userContext.dependencyId) return
    throw new DomainError('No tienes permisos sobre visitas extraordinarias de otra gerencia.', 'FORBIDDEN', 403)
  }

  throw new DomainError('No tienes permisos para gestionar esta visita extraordinaria.', 'FORBIDDEN', 403)
}

export async function createExtraordinaryDispatch(data: any, userId: number, userDiningRoomId?: number, userContext?: any) {
  // Si el usuario no es global, asegurar que solo registre para su ámbito
  if (userContext && !userContext.isGlobal) {
    const userSubIds: number[] = userContext.subdependencyIds || (userContext.subdependencyId ? [userContext.subdependencyId] : [])
    
    if (userContext.dependencyId) {
      data.dependencyId = userContext.dependencyId
    }

    if (userSubIds.length > 0 && data.subdependencyId) {
      if (!userSubIds.includes(Number(data.subdependencyId))) {
        throw new DomainError('No puedes registrar visitas extraordinarias para una subdependencia no autorizada.', 'FORBIDDEN', 403)
      }
    }
  }

  const validatedData = validateExtraordinaryDispatch(data, userDiningRoomId)
  
  const createdRecords = []
  for (const shift of validatedData.shifts) {
    const dispatchData = {
      ...validatedData,
      shiftType: shift.shiftType,
      quantity: shift.quantity,
      dispatchedById: userId
    }
    const record = await extraordinaryRepo.createExtraordinaryDispatch(dispatchData)
    createdRecords.push(record)
  }

  await logAudit(userId, 'CREATE', 'EXTRAORDINARY_DISPATCH', createdRecords[0]?.id || 0, `Visitas registradas: ${validatedData.companyName} (${validatedData.personId}) - ${validatedData.shifts.length} turnos`)
  
  return createdRecords.length === 1 ? createdRecords[0] : createdRecords
}

export async function updateExtraordinaryDispatch(id: number, data: any, userId: number, userContext?: any) {
  if (userContext && !userContext.isGlobal) {
    const existing = await extraordinaryRepo.findExtraordinaryById(id)
    if (!existing) throw new DomainError('Visita extraordinaria no encontrada', 'NOT_FOUND', 404)
    checkExtraordinaryAccess(existing, userContext)
  }

  const validatedData = validateExtraordinaryDispatch(data, data.diningRoomId)
  const updatedRecord = await extraordinaryRepo.updateExtraordinaryDispatch(id, validatedData)
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita actualizada: ${updatedRecord.companyName}`)
  return updatedRecord
}

export async function deleteExtraordinaryDispatch(id: number, userId: number, userContext?: any) {
  if (userContext && !userContext.isGlobal) {
    const existing = await extraordinaryRepo.findExtraordinaryById(id)
    if (!existing) throw new DomainError('Visita extraordinaria no encontrada', 'NOT_FOUND', 404)
    checkExtraordinaryAccess(existing, userContext)
  }

  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'REJECTED')
  await logAudit(userId, 'DELETE', 'EXTRAORDINARY_DISPATCH', id, `Visita eliminada/anulada: ${record.companyName}`)
  return record
}

export async function approveExtraordinaryDispatch(id: number, userId: number, userContext?: any) {
  if (userContext && !userContext.isGlobal) {
    const existing = await extraordinaryRepo.findExtraordinaryById(id)
    if (!existing) throw new DomainError('Visita extraordinaria no encontrada', 'NOT_FOUND', 404)
    checkExtraordinaryAccess(existing, userContext)
  }

  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'APPROVED', userId)
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita aprobada: ${record.companyName}`)
  return record
}

export async function rejectExtraordinaryDispatch(id: number, userId: number, userContext?: any) {
  if (userContext && !userContext.isGlobal) {
    const existing = await extraordinaryRepo.findExtraordinaryById(id)
    if (!existing) throw new DomainError('Visita extraordinaria no encontrada', 'NOT_FOUND', 404)
    checkExtraordinaryAccess(existing, userContext)
  }

  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'REJECTED')
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita rechazada: ${record.companyName}`)
  return record
}

export async function getExtraordinaryDispatches(dateStr: string, diningRoomId?: number, userContext?: any) {
  return await extraordinaryRepo.getExtraordinaryDispatches(dateStr, diningRoomId, userContext)
}

export async function autocompleteVisitor(query: string) {
  if (!query || query.length < 3) return null
  return await extraordinaryRepo.findRecentVisitorByNameOrId(query)
}
