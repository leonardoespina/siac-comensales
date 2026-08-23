import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as diningRoomRepo from '../../repository/diningRoomRepository'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const siteIds = user.isGlobal ? undefined : (user.siteIds && user.siteIds.length > 0 ? user.siteIds : undefined)
  return await diningRoomRepo.listAll(false, siteIds)
})
