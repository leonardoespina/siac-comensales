import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // Solo el Admin Global debería tener este permiso
  await requirePermission(event, 'DEPENDENCIES', 'create')
  
  const body = await readBody(event)
  if (!body.name) {
    throw new ValidationError('El nombre de la dependencia es obligatorio')
  }

  // Si envían dependencyId, es una SUB-dependencia
  if (body.dependencyId) {
    return await dependencyRepo.createSubdependency(Number(body.dependencyId), body.name)
  }

  // Si no, es una Dependencia principal
  return await dependencyRepo.createDependency(body.name)
})
