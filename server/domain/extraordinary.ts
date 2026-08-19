import { ValidationError } from './errors'

export interface CreateExtraordinaryPayload {
  personId: string
  companyName: string
  quantity: number
  diningRoomId?: number
  [key: string]: any
}

export function validateExtraordinaryDispatch(data: CreateExtraordinaryPayload, fallbackDiningRoomId?: number) {
  if (!data.personId || !data.personId.trim() || !data.companyName || !data.companyName.trim()) {
    throw new ValidationError('Cédula/RIF y Nombre son requeridos.')
  }
  if (!data.quantity || data.quantity <= 0) {
    throw new ValidationError('La cantidad debe ser mayor a cero.')
  }
  const finalDiningRoomId = data.diningRoomId || fallbackDiningRoomId
  if (!finalDiningRoomId) {
    throw new ValidationError('El comedor es requerido.')
  }

  return {
    ...data,
    diningRoomId: finalDiningRoomId
  }
}
