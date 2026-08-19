import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const cedulaRaw = query.cedula as string

  if (!cedulaRaw) {
    throw new DomainError('Debe proporcionar una cédula', 400, 'BAD_REQUEST')
  }

  const cedula = cedulaRaw.trim()

  const diner = await prisma.diner.findUnique({
    where: { cedula },
    include: {
      subdependency: {
        include: {
          dependency: true
        }
      }
    }
  })

  if (!diner) {
    throw new DomainError('Comensal no registrado', 404, 'NOT_FOUND')
  }

  // Define hoy en hora local (Caracas)
  const todayStart = dayjs().tz('America/Caracas').startOf('day').toDate()
  const todayEnd = dayjs().tz('America/Caracas').endOf('day').toDate()

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
