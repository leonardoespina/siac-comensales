import { defineApiHandler } from '../../utils/handler'
import { requireAuth, requireUserContext } from '../../utils/auth'
import { positionService } from '../../services/positionService'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  const user = await requireUserContext(event)
  return positionService.getAllPositions(user.isGlobal)
})
