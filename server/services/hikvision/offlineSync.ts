/**
 * SUB-SERVICIO: Reconciliación de Eventos Offline de Hikvision (Store & Forward)
 * 
 * RESPONSABILIDAD:
 * - Lee eventos de acceso (AcsEvent) de la memoria interna del terminal biométrico.
 * - Concilia raciones diferidas actualizando `dispatchedAt` con la hora real de la marcación.
 * - Garantiza anti-duplicidad y emite evento `biometric:offline_synced`.
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { executeIsapiRequest } from './client'
import { HikvisionDeviceConfig } from '../../domain/biometrics'
import {
  OfflineAcsEventRaw,
  ReconciliationSummary,
  ReconciliationRecordResult,
  filterAndDeduplicateOfflineEvents,
  matchShiftForTime
} from '../../domain/offlineSync'
import {
  findDinerForOfflineSync,
  listActiveMealSchedulesForSync,
  findApprovedRequestsForDinerDate,
  markRequestDetailDispatched
} from '../../repository/offlineSyncRepository'
import { listActiveBiometricDiningRooms } from '../../repository/biometricRepository'
import { emitEvent } from '../../utils/eventBus'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function fetchAcsEventsFromDevice(
  device: HikvisionDeviceConfig,
  position = 0,
  maxResults = 50,
  startTime?: string,
  endTime?: string
): Promise<{ totalMatches: number; events: OfflineAcsEventRaw[] }> {
  const cond: any = {
    searchID: `sync_${Date.now()}`,
    searchResultPosition: position,
    maxResults,
    major: 0,
    minor: 0
  }
  if (startTime) cond.startTime = startTime
  if (endTime) cond.endTime = endTime

  const res = await executeIsapiRequest(
    device,
    '/ISAPI/AccessControl/AcsEvent?format=json',
    'POST',
    JSON.stringify({ AcsEventCond: cond })
  )

  if (!res.data.trim().startsWith('{')) {
    return { totalMatches: 0, events: [] }
  }

  const json = JSON.parse(res.data)
  return {
    totalMatches: json.AcsEvent?.totalMatches || 0,
    events: json.AcsEvent?.InfoList || []
  }
}

export async function reconcileOfflineEvents(
  device: HikvisionDeviceConfig,
  rawEvents: OfflineAcsEventRaw[]
): Promise<ReconciliationSummary> {
  const candidates = filterAndDeduplicateOfflineEvents(rawEvents)
  const schedules = await listActiveMealSchedulesForSync()

  const summary: ReconciliationSummary = {
    diningRoomId: device.diningRoomId,
    diningRoomName: device.diningRoomName,
    totalEventsRead: rawEvents.length,
    uniqueCandidates: candidates.length,
    dispatchedCount: 0,
    alreadyDispatchedCount: 0,
    noRequestCount: 0,
    notFoundCount: 0,
    wrongRoomCount: 0,
    results: []
  }

  for (const candidate of candidates) {
    const eventDay = dayjs(candidate.detectedAt).tz('America/Caracas')
    const timeStr = eventDay.format('HH:mm')
    const detectedShift = matchShiftForTime(timeStr, schedules)

    const dayStart = dayjs.utc(eventDay.format('YYYY-MM-DD')).toDate()
    const dayEnd = dayjs.utc(eventDay.format('YYYY-MM-DD')).endOf('day').toDate()

    const diner = await findDinerForOfflineSync(candidate.cedula)
    if (!diner) {
      summary.notFoundCount++
      summary.results.push({
        cedula: candidate.cedula,
        name: candidate.name,
        detectedAt: candidate.detectedAt,
        status: 'DINER_NOT_FOUND',
        message: 'No existe en el catálogo de comensales'
      })
      continue
    }

    const requests = await findApprovedRequestsForDinerDate(diner.id, dayStart, dayEnd)
    if (requests.length === 0) {
      summary.noRequestCount++
      summary.results.push({
        cedula: candidate.cedula,
        name: diner.name,
        detectedAt: candidate.detectedAt,
        shiftType: detectedShift || 'DESCONOCIDO',
        status: 'NO_APPROVED_REQUEST',
        message: 'Sin solicitud aprobada para hoy'
      })
      continue
    }

    // REGLA 1 (Comedor Estricto): El comensal debe tener solicitud aprobada en ESTE comedor
    const roomRequests = requests.filter(r => r.request.diningRoomId === device.diningRoomId)
    if (roomRequests.length === 0) {
      summary.wrongRoomCount++
      const assignedRoom = requests[0]?.request.diningRoom?.name || 'otro comedor'
      summary.results.push({
        cedula: candidate.cedula,
        name: diner.name,
        detectedAt: candidate.detectedAt,
        shiftType: detectedShift || 'DESCONOCIDO',
        status: 'WRONG_DINING_ROOM',
        message: `Ración asignada al comedor: ${assignedRoom}. No corresponde a ${device.diningRoomName}`
      })
      continue
    }

    // REGLA 2 (Turno y Horario Estricto): Debe coincidir con el turno del horario detectado
    let matchingDetail = roomRequests.find(r => r.request.shiftType === detectedShift && r.modality === 'DINE_IN')

    // Si el turno no coincide exactamente (por desfase del reloj del terminal antes de sincronizarlo)
    // pero el comensal tiene una única solicitud DINE_IN pendiente hoy en este mismo comedor:
    if (!matchingDetail) {
      const pendingRoomRequests = roomRequests.filter(r => r.dispatchedAt === null && r.modality === 'DINE_IN')
      if (pendingRoomRequests.length === 1) {
        matchingDetail = pendingRoomRequests[0]
      }
    }

    if (!matchingDetail) {
      summary.noRequestCount++
      summary.results.push({
        cedula: candidate.cedula,
        name: diner.name,
        detectedAt: candidate.detectedAt,
        shiftType: detectedShift || 'DESCONOCIDO',
        status: 'NO_APPROVED_REQUEST',
        message: `Sin solicitud aprobada para ${detectedShift || 'este horario'} en ${device.diningRoomName}`
      })
      continue
    }

    if (matchingDetail.dispatchedAt !== null) {
      summary.alreadyDispatchedCount++
      summary.results.push({
        cedula: candidate.cedula,
        name: diner.name,
        detectedAt: candidate.detectedAt,
        shiftType: matchingDetail.request.shiftType,
        status: 'ALREADY_DISPATCHED',
        message: `Ya fue despachado previamente a las ${dayjs(matchingDetail.dispatchedAt).format('HH:mm:ss')}`
      })
      continue
    }

    // Conciliar ración con la hora real de la marcación en el dispositivo
    await markRequestDetailDispatched(matchingDetail.id, candidate.detectedAt)
    summary.dispatchedCount++
    summary.results.push({
      cedula: candidate.cedula,
      name: diner.name,
      detectedAt: candidate.detectedAt,
      shiftType: matchingDetail.request.shiftType,
      diningRoomId: matchingDetail.request.diningRoomId,
      diningRoomName: matchingDetail.request.diningRoom?.name,
      status: 'MATCHED_AND_DISPATCHED',
      message: `Ración conciliada con éxito para ${matchingDetail.request.shiftType}`
    })
  }

  emitEvent('biometric:offline_synced', summary)
  return summary
}

/**
 * Barre y pagina todos los eventos de la jornada de hoy de un dispositivo
 * y concilia las raciones pendientes en la base de datos.
 */
export async function syncDeviceToday(device: HikvisionDeviceConfig): Promise<ReconciliationSummary> {
  const todayStr = dayjs().tz('America/Caracas').format('YYYY-MM-DD')
  const startTime = `${todayStr}T00:00:00`
  const endTime = `${todayStr}T23:59:59`

  const firstBatch = await fetchAcsEventsFromDevice(device, 0, 30, startTime, endTime)
  const total = firstBatch.totalMatches
  if (total === 0 || firstBatch.events.length === 0) {
    return {
      diningRoomId: device.diningRoomId,
      diningRoomName: device.diningRoomName,
      totalEventsRead: 0,
      uniqueCandidates: 0,
      dispatchedCount: 0,
      alreadyDispatchedCount: 0,
      noRequestCount: 0,
      notFoundCount: 0,
      wrongRoomCount: 0,
      results: []
    }
  }

  const allEvents: OfflineAcsEventRaw[] = [...firstBatch.events]
  let position = firstBatch.events.length

  while (position < total) {
    const nextBatch = await fetchAcsEventsFromDevice(device, position, 30, startTime, endTime)
    if (nextBatch.events.length === 0) break
    allEvents.push(...nextBatch.events)
    position += nextBatch.events.length
  }

  const summary = await reconcileOfflineEvents(device, allEvents)
  console.log(`📡 [OfflineSync] Sincronización de hoy (${device.diningRoomName}): ${summary.dispatchedCount} raciones conciliadas, ${summary.alreadyDispatchedCount} ya despachadas, ${summary.wrongRoomCount} sede equivocada (${summary.uniqueCandidates} comensales).`)
  return summary
}

let isSyncRunning = false

/**
 * Itera todos los comedores con biométrico activo y sincroniza la jornada de hoy.
 * Posee guardia de concurrencia para evitar colisiones entre el cron y reconexiones.
 */
export async function syncAllActiveTerminalsToday(): Promise<ReconciliationSummary[]> {
  if (isSyncRunning) {
    console.log('⏳ [OfflineSync] Sincronización en curso, omitiendo ciclo redundante.')
    return []
  }
  isSyncRunning = true

  try {
    const activeRooms = await listActiveBiometricDiningRooms()
    const summaries: ReconciliationSummary[] = []

    for (const room of activeRooms) {
      if (!room.deviceIp || !room.deviceEnabled) continue
      const device: HikvisionDeviceConfig = {
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }

      try {
        const summary = await syncDeviceToday(device)
        summaries.push(summary)
      } catch (err: any) {
        console.error(`⚠️ [OfflineSync] Error sincronizando ${room.name} (${room.deviceIp}):`, err?.message || err)
      }
    }

    return summaries
  } finally {
    isSyncRunning = false
  }
}

