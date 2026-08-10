import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as diningRoomRepo from '../../repository/diningRoomRepository'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  return await diningRoomRepo.listAll(user.isGlobal)
})
