import * as extraordinaryRepo from '../repository/extraordinaryRepository'
import { logAudit } from '../utils/audit'
import { validateExtraordinaryDispatch } from '../domain/extraordinary'

export async function createExtraordinaryDispatch(data: any, userId: number, userDiningRoomId?: number) {
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
  
  // Si solo hay uno, retornamos el registro. Si hay múltiples, retornamos el array o el primero
  return createdRecords.length === 1 ? createdRecords[0] : createdRecords
}

export async function updateExtraordinaryDispatch(id: number, data: any, userId: number) {
  const validatedData = validateExtraordinaryDispatch(data, data.diningRoomId)
  const updatedRecord = await extraordinaryRepo.updateExtraordinaryDispatch(id, validatedData)
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita actualizada: ${updatedRecord.companyName}`)
  return updatedRecord
}

export async function deleteExtraordinaryDispatch(id: number, userId: number) {
  // Para eliminar, podríamos usar soft delete
  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'REJECTED')
  await logAudit(userId, 'DELETE', 'EXTRAORDINARY_DISPATCH', id, `Visita eliminada/anulada: ${record.companyName}`)
  return record
}

export async function approveExtraordinaryDispatch(id: number, userId: number) {
  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'APPROVED', userId)
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita aprobada: ${record.companyName}`)
  return record
}

export async function rejectExtraordinaryDispatch(id: number, userId: number) {
  const record = await extraordinaryRepo.updateExtraordinaryStatus(id, 'REJECTED')
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita rechazada: ${record.companyName}`)
  return record
}

export async function getExtraordinaryDispatches(dateStr: string, diningRoomId?: number) {
  return await extraordinaryRepo.getExtraordinaryDispatches(dateStr, diningRoomId)
}

export async function autocompleteVisitor(query: string) {
  if (!query || query.length < 3) return null
  return await extraordinaryRepo.findRecentVisitorByNameOrId(query)
}
