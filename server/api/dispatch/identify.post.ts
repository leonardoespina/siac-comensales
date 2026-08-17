import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isBetween from 'dayjs/plugin/isBetween'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(customParseFormat)

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const cedula = body.cedula?.trim()

  const diningRoomId = body.diningRoomId

  if (!cedula) {
    throw new DomainError('Debe proporcionar la cédula del comensal', 400, 'MISSING_CEDULA')
  }
  if (!diningRoomId) {
    throw new DomainError('Debe proporcionar el ID del comedor donde se realiza el despacho', 400, 'MISSING_DINING_ROOM')
  }

  // 1. Obtener la hora actual de Venezuela
  const now = dayjs().tz('America/Caracas')
  const currentTimeStr = now.format('HH:mm') // Formato 24h para comparación fácil
  const todayStart = now.startOf('day').toDate()
  const todayEnd = now.endOf('day').toDate()

  // 2. Buscar comensal
  const diner = await prisma.diner.findUnique({
    where: { cedula }
  })

  if (!diner) {
    throw new DomainError('Comensal no encontrado', 404, 'DINER_NOT_FOUND')
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
    throw new DomainError('El comensal no tiene ninguna solicitud aprobada para hoy.', 403, 'NO_APPROVED_REQUEST')
  }

  // 4. Validar que alguna de esas solicitudes pertenezca al comedor donde está el lector
  const validRoomRequests = requestDetails.filter(d => d.request.diningRoomId === diningRoomId)
  
  if (validRoomRequests.length === 0) {
    // Tiene comida, pero en otra sede
    const wrongRoom = requestDetails[0].request.diningRoom.name
    throw new DomainError(`Tiene comida asignada, pero en el comedor: ${wrongRoom}. Diríjase a esa ubicación.`, 403, 'WRONG_DINING_ROOM')
  }

  // 5. Cargar los horarios de la base de datos
  const schedules = await prisma.mealSchedule.findMany({ where: { active: true } })
  
  let matchedDetail: any = null
  let matchedShiftSchedule: any = null
  let upcomingShiftMessage = ''

  // 6. Verificar cuál de los turnos que tiene aprobados está activo en este momento
  for (const detail of validRoomRequests) {
    const schedule = schedules.find(s => s.shiftType === detail.request.shiftType)
    if (!schedule) continue

    const start = dayjs(schedule.startTime, 'HH:mm')
    const end = dayjs(schedule.endTime, 'HH:mm')
    const nowTime = dayjs(currentTimeStr, 'HH:mm')
    
    let isMatching = false
    
    // Lógica inclusiva: >= start y <= end
    if (end.isBefore(start)) {
      // Cruza la medianoche (ej: 22:00 a 11:30)
      if (!nowTime.isBefore(start) || !nowTime.isAfter(end)) {
        isMatching = true
      }
    } else {
      // Turno normal
      if (!nowTime.isBefore(start) && !nowTime.isAfter(end)) {
        isMatching = true
      }
    }

    if (isMatching) {
      matchedDetail = detail
      matchedShiftSchedule = schedule
      break // Encontramos el turno válido actual
    } else {
      // Guardamos la información de sus horarios para darle un mensaje claro
      upcomingShiftMessage += `[${schedule.shiftType}: ${schedule.startTime}-${schedule.endTime}] `
    }
  }

  // Si no hizo match con la hora actual, le decimos en qué horario debe venir
  if (!matchedDetail) {
    throw new DomainError(`Estás fuera de horario. Tus turnos aprobados son: ${upcomingShiftMessage.trim()}`, 403, 'OUT_OF_SCHEDULE')
  }

  // 7. Verificar si ese turno específico ya fue despachado
  if (matchedDetail.dispatchedAt) {
    const dispatchedTime = dayjs(matchedDetail.dispatchedAt).tz('America/Caracas').format('hh:mm A')
    throw new DomainError(`ALERTA: El comensal ya retiró su ${matchedShiftSchedule.shiftType} a las ${dispatchedTime}.`, 409, 'ALREADY_DISPATCHED')
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
      shift: matchedShiftSchedule.shiftType,
      modality: updatedDetail.modality,
      rationType: updatedDetail.rationType,
      quantity: updatedDetail.quantity,
      dispatchedAt: updatedDetail.dispatchedAt
    }
  }
})
