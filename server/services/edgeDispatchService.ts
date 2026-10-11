/**
 * SERVICIO: Orquestador de Sincronización para el Kiosk Edge Agent
 * 
 * REGLAS DE ARQUITECTURA:
 * - Orquesta casos de uso de ingesta y entrega de padrón.
 * - CERO entorno HTTP (no conoce H3 ni event).
 * - CERO prisma directo (usa edgeDispatchRepository y transacciones).
 * - Tamaño conciso (< 150 líneas).
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { DomainError } from '../domain/errors'
import * as edgeRepo from '../repository/edgeDispatchRepository'
import { prisma } from '../utils/prisma'
import { emitEvent } from '../utils/eventBus'

dayjs.extend(utc)
dayjs.extend(timezone)

export interface EdgeBatchItem {
  detailId: number
  cedula: string
  shiftType: string
  dispatchedAt: string
}

export async function getDailySheetForEdge(diningRoomId: number, dateStr?: string) {
  if (!diningRoomId || isNaN(diningRoomId)) {
    throw new DomainError('El ID del comedor es obligatorio', 'INVALID_DINING_ROOM_ID', 400)
  }

  const roomConfig = await edgeRepo.getDiningRoomConfigForEdge(diningRoomId)
  if (!roomConfig) {
    throw new DomainError(`Comedor con ID ${diningRoomId} no encontrado`, 'DINING_ROOM_NOT_FOUND', 404)
  }

  const todayKey = dateStr || dayjs().tz('America/Caracas').format('YYYY-MM-DD')
  const dayStart = dayjs.utc(todayKey).startOf('day').toDate()
  const dayEnd = dayjs.utc(todayKey).endOf('day').toDate()

  const [rawRequests, schedules] = await Promise.all([
    edgeRepo.getApprovedRequestsForDiningRoomDate(diningRoomId, dayStart, dayEnd),
    edgeRepo.getActiveMealSchedulesForEdge()
  ])

  const authorizedDiners = rawRequests.map(r => ({
    detailId: r.id,
    cedula: r.diner.cedula,
    name: r.diner.name,
    shiftType: r.request.shiftType,
    modality: r.modality,
    rationType: r.rationType,
    dispatchedAt: r.dispatchedAt ? r.dispatchedAt.toISOString() : null
  }))

  return {
    diningRoom: {
      id: roomConfig.id,
      name: roomConfig.name,
      deviceIp: roomConfig.deviceIp,
      devicePort: roomConfig.devicePort,
      deviceUser: roomConfig.deviceUser,
      devicePassword: roomConfig.devicePassword,
      deviceEnabled: roomConfig.deviceEnabled
    },
    date: todayKey,
    schedules,
    diners: authorizedDiners,
    totalApproved: authorizedDiners.length,
    generatedAt: new Date().toISOString()
  }
}

export async function processEdgeBatchSync(items: EdgeBatchItem[], diningRoomId: number) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, processedCount: 0, items: [] }
  }

  const validItems = items.filter(i => i.detailId && i.dispatchedAt)
  if (validItems.length === 0) {
    return { success: true, processedCount: 0, items: [] }
  }

  // Ejecución transaccional atómica
  const updatedRecords = await prisma.$transaction(async (tx) => {
    const payloads = validItems.map(item => ({
      detailId: item.detailId,
      dispatchedAt: new Date(item.dispatchedAt)
    }))
    return await edgeRepo.batchUpdateDispatchedDetails(payloads, tx)
  })

  // Notificar al EventBus para actualización reactiva
  for (const item of validItems) {
    emitEvent('biometric:identified', {
      diningRoomId,
      diningRoomName: `Comedor #${diningRoomId}`,
      cedula: item.cedula,
      name: item.cedula,
      verifyMode: 'edge_offline_sync',
      detectedAt: item.dispatchedAt
    })
  }

  return {
    success: true,
    processedCount: updatedRecords.length,
    syncedAt: new Date().toISOString()
  }
}
