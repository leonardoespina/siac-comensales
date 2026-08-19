import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const user = await requireUserContext(event)

  const diningRoomId = query.diningRoomId ? Number(query.diningRoomId) : (user.diningRoomId ? user.diningRoomId : undefined)
  const dateStr = query.date as string || dayjs().format('YYYY-MM-DD')
  
  const dispatches = await extraordinaryService.getExtraordinaryDispatches(dateStr, diningRoomId)

  return {
    success: true,
    data: dispatches
  }
})
