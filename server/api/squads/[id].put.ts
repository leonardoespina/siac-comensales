import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SQUADS', 'update')
  const user = await requireUserContext(event)
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  if (!body.name) throw new ValidationError('El nombre es obligatorio')

  return await dependencyRepo.updateSquad(id, body.name)
})
