import { defineApiHandler } from '../../../utils/handler'
import { requireUserContext } from '../../../utils/auth'
import * as massiveService from '../../../services/massiveService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const user = await requireUserContext(event)

  const diningRoomId = query.diningRoomId ? Number(query.diningRoomId) : (user.diningRoomId ? user.diningRoomId : undefined)
  const dateStr = query.date as string || dayjs().format('YYYY-MM-DD')
  
  const dependencyId = query.dependencyId ? Number(query.dependencyId) : null
  const subdependencyId = query.subdependencyId ? Number(query.subdependencyId) : null

  const batches = await massiveService.getMassiveBatchesList(diningRoomId, dateStr, dependencyId, subdependencyId)

  return {
    success: true,
    batches
  }
})