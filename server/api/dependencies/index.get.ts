import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  
  // Si el usuario tiene una Dependencia Principal asignada, ESTÁ RESTRINGIDO a ella,
  // sin importar si su rol dice "GLOBAL_ACCESS". El GLOBAL_ACCESS en este contexto
  // significa que es "Global" dentro de su dependencia (acceso a todas sus subdependencias).
  // Si NO tiene dependencia asignada (es nula) y su rol es Global, entonces sí ve toda la empresa.
  const filterByDependencyId = user.dependencyId ? user.dependencyId : null

  const deps = await dependencyRepo.getAllDependencies(false, filterByDependencyId)
  if (deps.length > 0) {
    console.log('DEBUG DEPS:', JSON.stringify(deps[0].subdependencies, null, 2))
  }
  return deps
})
