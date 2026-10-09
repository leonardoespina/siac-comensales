/**
 * DOMINIO: Sincronización y Reconciliación Offline de Biometría Hikvision
 * 
 * REGLAS DE ARQUITECTURA:
 * - CERO dependencias externas (prohibido Prisma, Nuxt, H3, librerías HTTP).
 * - Solo interfaces, tipos y funciones puras (input -> output).
 */

export interface OfflineAcsEventRaw {
  time: string
  employeeNoString?: string
  cardNo?: string
  name?: string
  major: number
  minor: number
}

export interface OfflineDinerCandidate {
  cedula: string
  name: string
  detectedAt: Date
  rawTime: string
  passCount: number
}

export type ReconciliationStatus =
  | 'MATCHED_AND_DISPATCHED'
  | 'ALREADY_DISPATCHED'
  | 'NO_APPROVED_REQUEST'
  | 'DINER_NOT_FOUND'
  | 'WRONG_DINING_ROOM'

export interface ReconciliationRecordResult {
  cedula: string
  name: string
  detectedAt: Date
  shiftType?: string
  diningRoomId?: number
  diningRoomName?: string
  status: ReconciliationStatus
  message: string
}

export interface ReconciliationSummary {
  diningRoomId: number
  diningRoomName: string
  totalEventsRead: number
  uniqueCandidates: number
  dispatchedCount: number
  alreadyDispatchedCount: number
  noRequestCount: number
  notFoundCount: number
  results: ReconciliationRecordResult[]
}

export interface MealScheduleRule {
  shiftType: string
  startTime: string
  endTime: string
  active?: boolean
}

/**
 * Normaliza y limpia una cédula para compatibilidad con employeeNoString de Hikvision.
 */
export function sanitizeOfflineCedula(rawCedula?: string): string {
  if (!rawCedula) return ''
  return rawCedula.trim().replace(/\D/g, '')
}

/**
 * Filtra eventos válidos de reconocimiento facial exitoso (minor: 75 o minor: 1)
 * y los agrupa por cédula para evitar registros duplicados en el mismo lote.
 */
export function filterAndDeduplicateOfflineEvents(
  rawEvents: OfflineAcsEventRaw[]
): OfflineDinerCandidate[] {
  if (!Array.isArray(rawEvents)) return []

  const validEvents = rawEvents.filter(ev => {
    // minor 75 = Verificación facial exitosa, minor 1 = Tarjeta/Paso legal
    return (ev.minor === 75 || ev.minor === 1) && !!(ev.employeeNoString || ev.cardNo)
  })

  const candidateMap = new Map<string, OfflineDinerCandidate>()

  for (const ev of validEvents) {
    const cedula = sanitizeOfflineCedula(ev.employeeNoString || ev.cardNo)
    if (!cedula) continue

    const detectedAt = new Date(ev.time)

    if (!candidateMap.has(cedula)) {
      candidateMap.set(cedula, {
        cedula,
        name: ev.name?.trim() || '',
        detectedAt,
        rawTime: ev.time,
        passCount: 1
      })
    } else {
      const existing = candidateMap.get(cedula)!
      existing.passCount++
      // Mantener la primera marcación como la hora oficial de consumo
      if (detectedAt < existing.detectedAt) {
        existing.detectedAt = detectedAt
        existing.rawTime = ev.time
      }
    }
  }

  return Array.from(candidateMap.values())
}

/**
 * Determina el turno correspondiente a una hora HH:mm basada en los horarios activos.
 */
export function matchShiftForTime(
  currentTimeStr: string,
  schedules: MealScheduleRule[]
): string | null {
  if (!schedules || schedules.length === 0) return null

  // Convertir HH:mm a minutos del día para comparación pura y robusta
  const toMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':')
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10)
  }

  const currentMin = toMinutes(currentTimeStr)

  for (const s of schedules) {
    if (s.active === false) continue
    const startMin = toMinutes(s.startTime)
    const endMin = toMinutes(s.endTime)

    if (endMin < startMin) {
      // Turno que cruza la medianoche (ej: 22:00 a 02:00)
      if (currentMin >= startMin || currentMin <= endMin) {
        return s.shiftType
      }
    } else {
      // Turno estándar dentro del mismo día
      if (currentMin >= startMin && currentMin <= endMin) {
        return s.shiftType
      }
    }
  }

  return null
}
