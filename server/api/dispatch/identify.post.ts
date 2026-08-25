import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import isBetween from 'dayjs/plugin/isBetween.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(customParseFormat)

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  await requirePermission(event, 'DISPATCH', 'create')
  const cedula = body.cedula?.trim()

  const diningRoomId = body.diningRoomId

  if (!cedula) {
    throw new DomainError('Debe proporcionar la cédula del comensal', 'MISSING_CEDULA', 400)
  }
  if (!diningRoomId) {
    throw new DomainError('Debe proporcionar el ID del comedor donde se realiza el despacho', 'MISSING_DINING_ROOM', 400)
  }

  // 1. Obtener la hora actual de Venezuela
  const now = dayjs().tz('America/Caracas')
  const currentTimeStr = now.format('HH:mm') // Formato 24h para comparación fácil
  
  // Para comparar con Prisma que guarda las fechas a la medianoche UTC exacta (T00:00:00.000Z)
  const todayStart = dayjs.utc(now.format('YYYY-MM-DD')).toDate()
  const todayEnd = dayjs.utc(now.format('YYYY-MM-DD')).endOf('day').toDate()

  // 2. Buscar comensal
  const diner = await prisma.diner.findUnique({
    where: { cedula }
  })

  if (!diner) {
    throw new DomainError('Comensal no encontrado', 'DINER_NOT_FOUND', 404)
  }

  // 3. Buscar TODAS las solicitudes APROBADAS del comensal para HOY
  const requestDetails = await prisma.dinerRequestDetail.findMany({
    where: {
      dinerId: diner.id,
      request: {
        date: {
          gte: todayStart,
          lte: todayEnd
        },
        status: 'APPROVED',
        deletedAt: null
      }
    },
    include: {
      request: {
        include: {
          diningRoom: true
        }
      }
    }
  })

  if (requestDetails.length === 0) {
    throw new DomainError('El comensal no tiene ninguna solicitud aprobada para hoy.', 'NO_APPROVED_REQUEST', 403)
  }

  // 4. Cargar los horarios activos de la base de datos
  const schedules = await prisma.mealSchedule.findMany({ where: { active: true } })

  let currentActiveShift: string | null = null
  let currentShiftSchedule: any = null
  let upcomingShiftMessage = ''

  // 6. Verificar cuál turno está activo en este momento
  for (const schedule of schedules) {
    const start = dayjs(schedule.startTime, 'HH:mm')
    const end = dayjs(schedule.endTime, 'HH:mm')
    const nowTime = dayjs(currentTimeStr, 'HH:mm')

    let isMatching = false
    if (end.isBefore(start)) {
      if (!nowTime.isBefore(start) || !nowTime.isAfter(end)) isMatching = true
    } else {
      if (!nowTime.isBefore(start) && !nowTime.isAfter(end)) isMatching = true
    }

    if (isMatching) {
      currentActiveShift = schedule.shiftType
      currentShiftSchedule = schedule
      break
    } else {
      if (nowTime.isBefore(end)) {
        upcomingShiftMessage += `[${schedule.shiftType}: ${start.format('hh:mm A')} - ${end.format('hh:mm A')}] `
      }
    }
  }

  // 7. PRIMERA PRIORIDAD: Verificar si el comensal YA retiró su plato individual para el turno activo (en CUALQUIER comedor)
  if (currentActiveShift) {
    const alreadyDispatchedInCurrentShift = requestDetails.find(
      d => d.request.shiftType === currentActiveShift && d.modality === 'DINE_IN' && d.dispatchedAt !== null
    )
    if (alreadyDispatchedInCurrentShift) {
      const dispatchedTime = dayjs(alreadyDispatchedInCurrentShift.dispatchedAt).tz('America/Caracas').format('hh:mm A')
      const roomName = alreadyDispatchedInCurrentShift.request.diningRoom?.name || 'otro comedor'
      throw new DomainError(
        `ALERTA: El comensal ya retiró su ${currentActiveShift} a las ${dispatchedTime} (en ${roomName}).`,
        'ALREADY_DISPATCHED',
        409
      )
    }
  }

  // 8. SEGUNDA PRIORIDAD: Buscar si tiene solicitud INDIVIDUAL (DINE_IN) para el turno activo en el comedor actual o en otro
  let matchedDetail: any = null
  if (currentActiveShift) {
    matchedDetail = requestDetails.find(
      d => d.request.shiftType === currentActiveShift && 
           d.modality === 'DINE_IN' &&
           d.request.diningRoomId === diningRoomId && 
           d.dispatchedAt === null
    )

    // Si no está asignado a este comedor, pero sí a otro (y no ha sido despachado)
    if (!matchedDetail) {
      const wrongRoomDetail = requestDetails.find(
        d => d.request.shiftType === currentActiveShift && 
             d.modality === 'DINE_IN' &&
             d.request.diningRoomId !== diningRoomId && 
             d.dispatchedAt === null
      )
      if (wrongRoomDetail) {
        const wrongRoom = wrongRoomDetail.request.diningRoom?.name || 'otro comedor'
        throw new DomainError(
          `Su ración de ${currentActiveShift} se encuentra asignada al comedor: ${wrongRoom}. Diríjase a esa ubicación.`,
          'WRONG_DINING_ROOM',
          403
        )
      }
    }
  }

  // 9. TERCERA PRIORIDAD: Si NO tiene solicitud individual (DINE_IN), verificar si su comida del turno activo fue solicitada EXCLUSIVAMENTE en modalidad MASIVA (Para Llevar / TAKE_AWAY)
  if (currentActiveShift && !matchedDetail) {
    const massiveDetail = requestDetails.find(
      d => d.request.shiftType === currentActiveShift && d.modality === 'TAKE_AWAY' && d.dispatchedAt === null
    )
    if (massiveDetail) {
      const roomName = massiveDetail.request.diningRoom?.name || 'otro comedor'
      throw new DomainError(
        `Su comida fue solicitada en formato Masivo (Para Llevar) y se encuentra asignada al comedor: ${roomName}.`,
        'MASSIVE_REQUEST',
        403
      )
    }
  }

  // 9. TERCERA PRIORIDAD: Si no hizo match con el turno o fuera de horario
  if (!matchedDetail) {
    // Si en este momento HAY un turno activo de comida, pero el comensal no solicitó ración para este turno
    if (currentActiveShift) {
      const futureRequested = requestDetails
        .filter(d => d.dispatchedAt === null)
        .map(d => d.request.shiftType)
        .join(', ')

      if (futureRequested) {
        throw new DomainError(
          `Su comida no fue solicitada para el turno activo (${currentActiveShift}). Su próximo turno solicitado hoy es: ${futureRequested}.`,
          'NO_REQUEST_FOR_ACTIVE_SHIFT',
          403
        )
      } else {
        throw new DomainError(
          `Su comida no fue solicitada para el turno activo (${currentActiveShift}) ni para el resto del día.`,
          'NO_REQUEST_FOR_ACTIVE_SHIFT',
          403
        )
      }
    }

    const trimmedMessage = upcomingShiftMessage.trim()
    if (trimmedMessage === '') {
      throw new DomainError('Estás fuera de horario. Ya no tienes más turnos disponibles para el resto del día.', 'OUT_OF_SCHEDULE', 403)
    } else {
      throw new DomainError(`Estás fuera de horario. Tu próximo turno es: ${trimmedMessage}`, 'OUT_OF_SCHEDULE', 403)
    }
  }

  // 8. Despachar (Actualizar dispatchedAt)
  const updatedDetail = await prisma.dinerRequestDetail.update({
    where: { id: matchedDetail.id },
    data: { dispatchedAt: now.toDate() }
  })

  // Emitir evento in-memory (Opcional, útil para Websockets)
  // emitEvent('dispatch:created', { dinerId: diner.id, shiftType: currentShift })

  return {
    success: true,
    message: 'Despacho Exitoso',
    diner: {
      id: diner.id,
      name: diner.name,
      cedula: diner.cedula
    },
    dispatch: {
      shift: currentShiftSchedule?.shiftType || matchedDetail.request.shiftType,
      modality: updatedDetail.modality,
      rationType: updatedDetail.rationType,
      quantity: updatedDetail.quantity,
      dispatchedAt: updatedDetail.dispatchedAt
    }
  }
})
