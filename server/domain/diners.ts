/**
 * DOMINIO: Comensales (Diners)
 * 
 * REGLAS DE ARQUITECTURA:
 * - Cero dependencias externas (prohibido Prisma, Nuxt, H3).
 * - Solo interfaces y tipos.
 * - Funciones puras (sin efectos secundarios).
 */

// Valores posibles para raciones
export type RationType = 'NORMAL' | 'DIETA'
export type ShiftType = 'DESAYUNO' | 'ALMUERZO' | 'CENA' | 'SOBRECENA'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Dependency {
  id: number
  name: string
}

export interface Subdependency {
  id: number
  name: string
  dependencyId: number
}

export interface Squad {
  id: number
  name: string
  subdependencyId: number
}

export interface Diner {
  id: number
  cedula: string
  name: string
  rationType: RationType
  active: boolean
  squadId: number
  fingerprint?: string | null
  qrCode?: string | null
}

export interface DinerRequest {
  id: number
  date: Date
  shiftType: ShiftType
  status: RequestStatus
  createdById: number
  approvedById?: number | null
}

export interface DinerRequestDetail {
  id: number
  requestId: number
  dinerId: number
  rationType: RationType
}

/**
 * Validaciones Puras
 */

/**
 * Verifica si una solicitud de comensales cumple con el tiempo mínimo de anticipación (Lead Time).
 * Regla de negocio: Debe solicitarse al menos 24 horas antes del día del consumo.
 * 
 * @param requestDate - Fecha exacta en que el solicitante está creando la petición en el sistema.
 * @param targetConsumptionDate - Fecha calendario en la que se entregará la comida.
 * @returns boolean true si es válido.
 */
export function isLeadTimeValid(requestDate: Date, targetConsumptionDate: Date): boolean {
  // Convertimos las fechas a UTC para evitar desfases de zona horaria
  const requestTime = requestDate.getTime()
  
  // Asumimos que el consumo empieza al inicio del día objetivo (00:00:00)
  const targetTime = new Date(
    targetConsumptionDate.getFullYear(), 
    targetConsumptionDate.getMonth(), 
    targetConsumptionDate.getDate()
  ).getTime()

  const diffHours = (targetTime - requestTime) / (1000 * 60 * 60)
  
  // Debe haber al menos 24 horas de diferencia entre el momento de la petición y el día de consumo.
  return diffHours >= 24
}

/**
 * Verifica si un comensal puede ser asignado a un tipo de ración.
 * Ejemplo de regla de negocio futura: Podríamos bloquear que un comensal pida 'DIET' 
 * si no tiene un certificado médico (flag isMedicalPatient).
 */
export function canAssignRationType(diner: Diner, requestedType: RationType): boolean {
  // Por ahora, todos pueden pedir cualquier tipo, pero la función pura ya está estructurada.
  // if (requestedType === 'DIETA' && !diner.active) {
  //   return false // Un trabajador inactivo no puede pedir dieta
  // }
  return true
}
