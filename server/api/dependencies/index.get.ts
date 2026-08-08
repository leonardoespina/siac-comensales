import { defineApiHandler } from '../../utils/handler'
import { requireAuth } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'

export default defineApiHandler(async (event) => {
  // Verificamos solo que el usuario esté autenticado para listar dependencias
  // (El catálogo de áreas es necesario para los dropdowns de todos los roles)
  await requireAuth(event)
  
  // Retorna el árbol completo (Dependencia -> Subdependencia -> Cuadrilla)
  // ideal para llenar los selectores en el frontend.
  return await dependencyRepo.getAllDependencies()
})
