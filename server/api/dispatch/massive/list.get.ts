import { defineApiHandler } from '../../../utils/handler'
import { requireUserContext, requirePermission } from '../../../utils/auth'
import * as massiveService from '../../../services/massiveService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'MASSIVE_DISPATCH', 'read')
  const user = await requireUserContext(event)

  const diningRoomId = query.diningRoomId ? Number(query.diningRoomId) : (user.diningRoomId ? user.diningRoomId : undefined)
  const today = dayjs().format('YYYY-MM-DD')

  // Soporta rango de fechas (dateFrom/dateTo) y también el parámetro legacy "date" (una sola fecha)
  const dateFrom = (query.dateFrom as string) || (query.date as string) || today
  const dateTo   = (query.dateTo as string)   || (query.date as string) || today

  const dependencyId = query.dependencyId ? Number(query.dependencyId) : null
  const subdependencyId = query.subdependencyId ? Number(query.subdependencyId) : null

  const batches = await massiveService.getMassiveBatchesList(diningRoomId, dateFrom, dateTo, dependencyId, subdependencyId)

  return { success: true, batches }
})