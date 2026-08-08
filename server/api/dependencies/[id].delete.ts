import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DEPENDENCIES', 'delete')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError('ID no proporcionado')

  const query = getQuery(event)
  
  if (query.type === 'subdependency') {
    return await dependencyRepo.deleteSubdependency(id)
  }

  return await dependencyRepo.deleteDependency(id)
})
