import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DEPENDENCIES', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError('ID no proporcionado')

  const body = await readBody(event)
  if (!body.name) throw new ValidationError('El nombre es obligatorio')

  if (body.type === 'subdependency') {
    return await dependencyRepo.updateSubdependency(id, body.name, body.dependencyId ? Number(body.dependencyId) : undefined)
  }

  return await dependencyRepo.updateDependency(id, body.name)
})
