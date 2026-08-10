import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DEPENDENCIES', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError('ID no proporcionado')

  const query = getQuery(event)
  const type = query.type as string
  const action = query.action as string

  if (action !== 'restore') {
    throw new ValidationError('Acción no soportada en PATCH')
  }

  if (type === 'subdependency') {
    return await dependencyRepo.restoreSubdependency(id)
  }

  return await dependencyRepo.restoreDependency(id)
})
