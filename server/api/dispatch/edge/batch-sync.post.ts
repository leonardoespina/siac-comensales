import { defineApiHandler } from '../../../utils/handler'
import { processEdgeBatchSync } from '../../../services/edgeDispatchService'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const diningRoomId = parseInt(body?.diningRoomId, 10)
  const items = body?.items || []

  return await processEdgeBatchSync(items, diningRoomId)
})
