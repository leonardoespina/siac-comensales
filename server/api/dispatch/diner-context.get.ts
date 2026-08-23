import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'DISPATCH', 'read')
  const cedulaRaw = (query.cedula as string || '').trim()
  const diningRoomId = query.diningRoomId ? Number(query.diningRoomId) : undefined
  const searchQ = (query.q as string || '').trim()

  // Define hoy en hora local (Caracas)
  const todayStart = dayjs().tz('America/Caracas').startOf('day').toDate()
  const todayEnd = dayjs().tz('America/Caracas').endOf('day').toDate()

  // CASO 1: Búsqueda de lista de comensales asociados al Comedor o por consulta dinámica
  if (diningRoomId && !cedulaRaw) {
    const details = await prisma.dinerRequestDetail.findMany({
      where: {
        request: {
          diningRoomId: diningRoomId,
          date: {
            gte: todayStart,
            lte: todayEnd
          },
          status: 'APPROVED',
          deletedAt: null
        },
        ...(searchQ ? {
          diner: {
            OR: [
              { cedula: { contains: searchQ, mode: 'insensitive' } },
              { name: { contains: searchQ, mode: 'insensitive' } }
            ]
          }
        } : {})
      },
      include: {
        diner: {
          include: {
            subdependency: {
              include: { dependency: true }
            }
          }
        },
        request: true
      },
      take: 50
    })

    // Agrupar por comensal único con sus turnos asignados hoy
    const dinersMap = new Map<number, any>()
    for (const d of details) {
      if (!dinersMap.has(d.dinerId)) {
        dinersMap.set(d.dinerId, {
          id: d.diner.id,
          cedula: d.diner.cedula,
          name: d.diner.name,
          rationType: d.diner.rationType,
          dependencyName: d.diner.subdependency?.dependency?.name || 'N/A',
          subdependencyName: d.diner.subdependency?.name || 'N/A',
          shifts: []
        })
      }
      const entry = dinersMap.get(d.dinerId)
      entry.shifts.push({
        shiftType: d.request.shiftType,
        dispatchedAt: d.dispatchedAt
      })
    }

    return {
      diners: Array.from(dinersMap.values())
    }
  }

  // CASO 2: Búsqueda individual de contexto de un comensal específico (por Cédula o Nombre)
  if (!cedulaRaw) {
    throw new DomainError('Debe proporcionar una cédula o seleccionar un comensal', 400, 'BAD_REQUEST')
  }

  let diner = await prisma.diner.findUnique({
    where: { cedula: cedulaRaw },
    include: {
      subdependency: {
        include: { dependency: true }
      }
    }
  })

  // Si no encuentra por cédula exacta, buscar por nombre o cédula parcial
  if (!diner) {
    diner = await prisma.diner.findFirst({
      where: {
        OR: [
          { cedula: { contains: cedulaRaw, mode: 'insensitive' } },
          { name: { contains: cedulaRaw, mode: 'insensitive' } }
        ]
      },
      include: {
        subdependency: {
          include: { dependency: true }
        }
      }
    })
  }

  if (!diner) {
    throw new DomainError('Comensal no registrado', 404, 'NOT_FOUND')
  }

  // Fetch all DINE_IN requests for today
  const requests = await prisma.dinerRequestDetail.findMany({
    where: {
      dinerId: diner.id,
      modality: 'DINE_IN',
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
      request: true
    }
  })

  return {
    diner,
    requests
  }
})
