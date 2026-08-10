import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SQUADS', 'read')
  const user = await requireUserContext(event)

  return await dependencyRepo.getAllSquads(user.isGlobal)
})
