import { ValidationError } from './errors'

export interface CreateExtraordinaryPayload {
  personId: string
  companyName: string
  shifts: { shiftType: string, quantity: number }[]
  diningRoomId?: number
  dependencyId?: number
  subdependencyId?: number
  date?: string
  [key: string]: any
}

export function validateExtraordinaryDispatch(data: CreateExtraordinaryPayload, fallbackDiningRoomId?: number) {
  if (!data.personId || !data.personId.trim() || !data.companyName || !data.companyName.trim()) {
    throw new ValidationError('Cédula/RIF y Nombre son requeridos.')
  }
  // Filtrar solo los turnos con cantidad mayor a cero
  const validShifts = (data.shifts || []).filter(s => Number(s.quantity) > 0)

  if (validShifts.length === 0) {
    throw new ValidationError('Debe indicar la cantidad para al menos un turno (Desayuno, Almuerzo, Cena o Sobrecena).')
  }
  
  const finalDiningRoomId = data.diningRoomId || fallbackDiningRoomId
  if (!finalDiningRoomId) {
    throw new ValidationError('El comedor es requerido.')
  }

  return {
    ...data,
    shifts: validShifts,
    diningRoomId: finalDiningRoomId
  }
}
