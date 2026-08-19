import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const { cedula, shiftType, diningRoomId, observations } = body

  if (!cedula || !shiftType || !diningRoomId) {
    throw new DomainError('Faltan datos requeridos', 400, 'BAD_REQUEST')
  }

  // 1. Validar Identidad
  const diner = await prisma.diner.findUnique({ where: { cedula } })
  if (!diner) {
    throw new DomainError('Comensal no registrado', 404, 'NOT_FOUND')
  }

  // Define hoy basado en hora de Caracas, pero formateado en UTC exacta para coincidir con BD
  const now = dayjs().tz('America/Caracas')
  const todayStart = dayjs.utc(now.format('YYYY-MM-DD')).toDate()
  const todayEnd = dayjs.utc(now.format('YYYY-MM-DD')).endOf('day').toDate()

  // 2. Regla de Oro: Buscar si ya tiene una comida despachada (Doble Plato)
  const existingDispatched = await prisma.dinerRequestDetail.findFirst({
    where: {
      dinerId: diner.id,
      modality: 'DINE_IN', // Solo verificamos las bandejas individuales consumidas en sitio
      dispatchedAt: { not: null },
      request: {
        date: {
          gte: todayStart,
          lte: todayEnd
        },
        shiftType: shiftType,
        status: 'APPROVED',
        deletedAt: null
      }
    }
  })

  if (existingDispatched) {
    // Extraer hora local
    const hhmm = existingDispatched.dispatchedAt ? existingDispatched.dispatchedAt.toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit' }) : 'recientemente'
    throw new DomainError(`¡Alto! Este comensal ya retiró su ${shiftType} a las ${hhmm}.`, 403, 'DOUBLE_DISH')
  }

  // 3. Buscar si tiene una solicitud pendiente sin despachar
  const pendingRequest = await prisma.dinerRequestDetail.findFirst({
    where: {
      dinerId: diner.id,
      modality: 'DINE_IN',
      dispatchedAt: null,
      request: {
        date: {
          gte: todayStart,
          lte: todayEnd
        },
        shiftType: shiftType,
        status: 'APPROVED',
        deletedAt: null
      }
    },
    include: {
      request: true
    }
  })

  const user = await requireUserContext(event)

  if (pendingRequest) {
    // Caso A: Tenía solicitud pendiente
    await prisma.dinerRequestDetail.update({
      where: { id: pendingRequest.id },
      data: { 
        dispatchedAt: new Date(),
        dispatchedById: user.id
      }
    })
    return {
      message: 'Despacho asistido exitoso (Tenía solicitud previa).',
      dinerName: diner.name
    }
  } else {
    // Caso B: No tenía comida asignada (Crear Emergencia)
    // Create the Request
    const batchCode = `EMERGENCIA-ASISTIDO-${Date.now().toString().slice(-6)}`
    
    await prisma.dinerRequest.create({
      data: {
        date: todayStart,
        shiftType: shiftType,
        status: 'APPROVED',
        batchCode: batchCode,
        createdById: user.id,
        approvedById: user.id,
        diningRoomId: diningRoomId,
        targetSubdependencyId: diner.subdependencyId,
        observations: observations || 'Despacho asistido libre generado por el operador.',
        details: {
          create: [{
            dinerId: diner.id,
            quantity: 1,
            modality: 'DINE_IN',
            dispatchedAt: new Date(),
            dispatchedById: user.id,
            isEmergency: true
          }]
        }
      }
    })

    return {
      message: 'Despacho asistido exitoso (Emergencia generada).',
      dinerName: diner.name
    }
  }
})
