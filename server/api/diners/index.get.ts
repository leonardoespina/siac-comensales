import { defineApiHandler } from '../../utils/handler'
import { requireAnyPermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  await requireAnyPermission(event, ['DINERS', 'MY_SQUADS'], 'read')
  const user = await requireUserContext(event)
  
  // 1. Aislamiento Cero Confianza (Tenant Isolation)
  const isGlobal = user.isGlobal === true
  const query = getQuery(event)
  
  let targetSubdependency: number | undefined
  let targetDependency: number | undefined
  let targetSubdependencies: number[] | undefined

  const userSubIds: number[] = user.subdependencyIds || (user.subdependencyId ? [user.subdependencyId] : [])

  if (!isGlobal) {
    // Si el usuario envió un filtro de subdependencia específico en la query:
    if (query.subdependencyId) {
      const reqSubId = Number(query.subdependencyId)
      // Validamos que pertenezca a sus subdependencias autorizadas o a su gerencia
      if (userSubIds.includes(reqSubId) || user.dependencyId) {
        targetSubdependency = reqSubId
      }
    } else if (userSubIds.length > 1) {
      // Supervisor multi-área sin filtro específico: trae todos sus comensales autorizados
      targetSubdependencies = userSubIds
    } else if (userSubIds.length === 1) {
      targetSubdependency = userSubIds[0]
    } else if (user.dependencyId) {
      targetDependency = user.dependencyId
    } else {
      return []
    }
  } else {
    // Modo Global: Permitimos que el Frontend envíe el ID que desea buscar.
    targetSubdependency = query.subdependencyId ? Number(query.subdependencyId) : undefined
    targetDependency = query.dependencyId ? Number(query.dependencyId) : undefined
  }

  // 2. Ejecutar la búsqueda basada en los filtros ya seguros
  const allowedSiteIds = isGlobal ? undefined : (user.siteIds || [])

  if (targetSubdependency) {
    return await dinerRepo.getDinersBySubdependency(targetSubdependency, undefined, isGlobal, allowedSiteIds)
  }

  if (targetSubdependencies && targetSubdependencies.length > 0) {
    return await dinerRepo.getDinersBySubdependencies(targetSubdependencies, isGlobal, allowedSiteIds)
  }
  
  if (targetDependency) {
    return await dinerRepo.getDinersByDependency(targetDependency, isGlobal, allowedSiteIds)
  }

  // Si no hay filtros válidos, devolvemos vacío
  return []
})
