import { defineApiHandler } from '../../../utils/handler'
import { getDailySheetForEdge } from '../../../services/edgeDispatchService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const diningRoomId = parseInt(query.diningRoomId as string, 10)
  const date = query.date as string | undefined

  return await getDailySheetForEdge(diningRoomId, date)
})
