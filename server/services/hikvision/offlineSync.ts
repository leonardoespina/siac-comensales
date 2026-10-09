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
    const matchingDetail = requests.find(r => r.request.shiftType === detectedShift)

    if (!matchingDetail) {
      summary.noRequestCount++
      summary.results.push({
        cedula: candidate.cedula,
        name: diner.name,
        detectedAt: candidate.detectedAt,
        shiftType: detectedShift || 'DESCONOCIDO',
        status: 'NO_APPROVED_REQUEST',
        message: `Sin solicitud aprobada para ${detectedShift || 'este horario'}`
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
