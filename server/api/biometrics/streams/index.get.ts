import { defineApiHandler } from '../../../utils/handler'
import { getStreamSnapshot, getAllStreamSnapshots } from '../../../services/hikvisionService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const diningRoomId = query.diningRoomId ? parseInt(String(query.diningRoomId), 10) : null

  if (diningRoomId) {
    const snapshot = getStreamSnapshot(diningRoomId)
    return snapshot ? [snapshot] : []
  }

  return getAllStreamSnapshots()
})
