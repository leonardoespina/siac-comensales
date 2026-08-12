import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)

  return await dependencyRepo.getAllSquads(user.isGlobal)
})
