import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'

export default defineApiHandler(async (event) => {
  // Verificamos permisos mínimos. Cualquiera que pueda ver comensales o dependencias necesita el catálogo
  // Validamos con SQUADS read, aunque podríamos dejarlo más abierto.
  await requirePermission(event, 'SQUADS', 'read')

  // Retorna el catálogo base de cuadrillas (A, B, C, Administrativa)
  return await dependencyRepo.getAllSquads()
})
