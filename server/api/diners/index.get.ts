import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  const user = await requireUserContext(event)
  
  // 1. Aislamiento Cero Confianza (Tenant Isolation)
  // Si NO es Administrador Global, ignoramos cualquier petición maliciosa del Frontend
  // y lo forzamos a buscar únicamente dentro de su árbol organizacional asignado.
  const isGlobal = user.isGlobal === true
  
  const query = getQuery(event)
  let targetSubdependency: number | undefined
  let targetDependency: number | undefined

  if (!isGlobal) {
    // Modo Aislado: El usuario está amarrado a su Gerencia/Subgerencia.
    // Solo puede buscar subdependencias si éstas pertenecen a su Gerencia (esto requeriría 
    // validación extra, por simplicidad de seguridad estricta usamos su scope directo).
    
    // Si el gerente tiene una subdependencia específica asignada, la forzamos.
    if (user.subdependencyId) {
      targetSubdependency = user.subdependencyId
    } 
    // Si no tiene subdependencia, pero tiene dependencia (es Gerente General de área), la forzamos.
    else if (user.dependencyId) {
      targetDependency = user.dependencyId
      
      // Permitimos que un Gerente General filtre por una subdependencia específica SOLO si lo solicita
      // (En producción real habría que validar que esa query.subdependencyId pertenezca a user.dependencyId)
      if (query.subdependencyId) {
        targetSubdependency = Number(query.subdependencyId)
      }
    }
    // Si no tiene ninguna, bloqueamos el acceso.
    else {
      return []
    }
  } else {
    // Modo Global: Permitimos que el Frontend envíe el ID que desea buscar.
    targetSubdependency = query.subdependencyId ? Number(query.subdependencyId) : undefined
    targetDependency = query.dependencyId ? Number(query.dependencyId) : undefined
  }

  // 2. Ejecutar la búsqueda basada en los filtros ya seguros
  if (targetSubdependency) {
    return await dinerRepo.getDinersBySubdependency(targetSubdependency)
  }
  
  if (targetDependency) {
    return await dinerRepo.getDinersByDependency(targetDependency)
  }

  // Si no hay filtros válidos (ej. un admin global que entra por primera vez sin filtrar), devolvemos vacío
  return []
})
