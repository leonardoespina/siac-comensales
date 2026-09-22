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
  await requirePermission(event, 'DINERS_REQUESTS', 'read')

  const query = getQuery(event)
  const dateParam = query.date as string
  const shiftType = query.shiftType as string
  const subdependencyId = query.subdependencyId ? parseInt(query.subdependencyId as string, 10) : undefined
  const dependencyId = query.dependencyId ? parseInt(query.dependencyId as string, 10) : undefined

  const diningRoomId = query.diningRoomId ? parseInt(query.diningRoomId as string, 10) : undefined

  if (!diningRoomId || isNaN(diningRoomId)) {
    throw new DomainError('El parámetro diningRoomId es requerido', 400, 'BAD_REQUEST')
  }

  // Construir rango de fecha en UTC
  const dateKey = dateParam || dayjs().tz('America/Caracas').format('YYYY-MM-DD')
  const targetDateStart = dayjs.utc(dateKey).startOf('day').toDate()
  const targetDateEnd = dayjs.utc(dateKey).endOf('day').toDate()

  // Si viene dependencyId, obtener todas sus subdependencias
  let subdepFilter: { subdependencyId: { in: number[] } } | undefined = undefined

  if (subdependencyId && !isNaN(subdependencyId)) {
    subdepFilter = { subdependencyId: { in: [subdependencyId] } }
  } else if (dependencyId && !isNaN(dependencyId)) {
    const subdeps = await prisma.subdependency.findMany({
      where: { dependencyId },
      select: { id: true }
    })
    if (subdeps.length > 0) {
      subdepFilter = { subdependencyId: { in: subdeps.map(s => s.id) } }
    }
  }

  const pendingDetails = await prisma.dinerRequestDetail.findMany({
    where: {
      dispatchedAt: null,
      request: {
        date: { gte: targetDateStart, lte: targetDateEnd },
        ...(shiftType ? { shiftType } : {}),
        status: 'APPROVED',
        deletedAt: null,
        diningRoomId
      },
      ...(subdepFilter ? { diner: subdepFilter } : {})
    },
    include: {
      diner: {
        include: {
          subdependency: {
            include: { dependency: true }
          }
        }
      }
    },
    orderBy: { diner: { name: 'asc' } }
  })

  return pendingDetails.map(d => ({
    id: d.id,
    cedula: d.diner.cedula,
    name: d.diner.name,
    rationType: d.rationType,
    modality: d.modality,
    dependencyName: d.diner.subdependency?.dependency?.name ?? 'N/A',
    subdependencyName: d.diner.subdependency?.name ?? 'N/A'
  }))
})
