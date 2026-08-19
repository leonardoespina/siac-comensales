import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const diningRoomId = query.diningRoomId ? parseInt(query.diningRoomId as string) : undefined
  const dateParam = query.date as string

  // Define hoy en hora local (Caracas) o usa la fecha provista
  const targetDate = dateParam ? dayjs.tz(dateParam, 'America/Caracas') : dayjs().tz('America/Caracas')
  const todayStart = dayjs.utc(targetDate.format('YYYY-MM-DD')).toDate()
  const todayEnd = dayjs.utc(targetDate.format('YYYY-MM-DD')).endOf('day').toDate()

  const whereClause: any = {
    dispatchedAt: { not: null },
    request: {
      date: {
        gte: todayStart,
        lte: todayEnd
      },
      deletedAt: null
    }
  }

  if (diningRoomId) {
    whereClause.request.diningRoomId = diningRoomId
  }

  const dispatches = await prisma.dinerRequestDetail.findMany({
    where: whereClause,
    include: {
      diner: true,
      request: true
    },
    orderBy: {
      dispatchedAt: 'desc'
    }
  })

  // Format the data for the frontend
  return dispatches.map(d => ({
    id: d.id,
    cedula: d.diner.cedula,
    dinerName: d.diner.name,
    shiftType: d.request.shiftType,
    dispatchedAt: d.dispatchedAt,
    isAssisted: d.dispatchedById !== null,
    isEmergency: d.isEmergency,
    quantity: d.quantity,
    modality: d.modality
  }))
})
