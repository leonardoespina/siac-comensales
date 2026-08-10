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
    const count = await dependencyRepo.countActiveDinersBySubdependency(id)
    if (count > 0) {
      throw new ValidationError(`No se puede desactivar la Subdependencia porque tiene ${count} comensal(es) activo(s).`)
    }
    return await dependencyRepo.deleteSubdependency(id)
  }

  const count = await dependencyRepo.countActiveSubdependencies(id)
  if (count > 0) {
    throw new ValidationError(`No se puede desactivar la Dependencia porque tiene ${count} subdependencia(s) activa(s).`)
  }
  return await dependencyRepo.deleteDependency(id)
})
