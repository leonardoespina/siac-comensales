import * as extraordinaryRepo from '../repository/extraordinaryRepository'
import { logAudit } from '../utils/audit'
import { validateExtraordinaryDispatch } from '../domain/extraordinary'

export async function createExtraordinaryDispatch(data: any, userId: number, userDiningRoomId?: number) {
  const validatedData = validateExtraordinaryDispatch(data, userDiningRoomId)

  const dispatchData = {
    ...validatedData,
    dispatchedById: userId
  }

  const record = await extraordinaryRepo.createExtraordinaryDispatch(dispatchData)
  await logAudit(userId, 'CREATE', 'EXTRAORDINARY_DISPATCH', record.id, `Visita registrada: ${validatedData.companyName} (${validatedData.personId}) - Platos: ${validatedData.quantity}`)
  return record
}

export async function updateExtraordinaryDispatch(id: number, data: any, userId: number) {
  const validatedData = validateExtraordinaryDispatch(data, data.diningRoomId)

  const updatedRecord = await extraordinaryRepo.updateExtraordinaryDispatch(id, validatedData)
  await logAudit(userId, 'UPDATE', 'EXTRAORDINARY_DISPATCH', id, `Visita actualizada: ${validatedData.companyName} (${validatedData.personId}) - Platos: ${validatedData.quantity}`)
  return updatedRecord
}

export async function deleteExtraordinaryDispatch(id: number, userId: number) {
  const deletedRecord = await extraordinaryRepo.deleteExtraordinaryDispatch(id)
  await logAudit(userId, 'DELETE', 'EXTRAORDINARY_DISPATCH', id, `Visita eliminada: ${deletedRecord.companyName} (${deletedRecord.personId})`)
  return deletedRecord
}

export async function getExtraordinaryDispatches(dateStr: string, diningRoomId?: number) {
  return await extraordinaryRepo.getExtraordinaryDispatches(dateStr, diningRoomId)
}

export async function autocompleteVisitor(query: string) {
  if (!query || query.length < 3) return null
  return await extraordinaryRepo.findRecentVisitorByNameOrId(query)
}
