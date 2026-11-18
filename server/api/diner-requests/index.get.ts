import { defineApiHandler } from '../../utils/handler'
import { requireUserContext, requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS_REQUESTS', 'read')
  const user = await requireUserContext(event)
  
  const query = getQuery(event)
  const startDate = query.startDate as string
  const endDate = query.endDate as string
  const siteId = query.siteId ? Number(query.siteId) : undefined
  const queryDependencyId = query.dependencyId ? Number(query.dependencyId) : undefined
  const querySubdependencyId = query.subdependencyId ? Number(query.subdependencyId) : undefined
  
  if (!startDate || !endDate) {
    throw new Error('Debe proveer startDate y endDate')
  }

  const userSubIds: number[] = user.subdependencyIds || (user.subdependencyId ? [user.subdependencyId] : [])

  // Resolver Gerencia (Dependency) efectiva respetando aislamiento de usuario casado
  let filterByDependencyId: number | null = null
  if (user.dependencyId) {
    filterByDependencyId = user.dependencyId
  } else if (queryDependencyId) {
    filterByDependencyId = queryDependencyId
  }

  // Resolver Subdependencia efectiva respetando aislamiento de usuario casado
  let filterBySubdependencyIds: number[] | null = null
  if (userSubIds.length > 0) {
    if (querySubdependencyId && userSubIds.includes(querySubdependencyId)) {
      filterBySubdependencyIds = [querySubdependencyId]
    } else {
      filterBySubdependencyIds = userSubIds
    }
  } else if (querySubdependencyId) {
    filterBySubdependencyIds = [querySubdependencyId]
  }

  // Restricción por Sedes Autorizadas:
  // Si el usuario no es global y tiene sedes asignadas, filtramos por sus sedes
  let effectiveSiteIds: number[] | null = null
  if (!user.isGlobal && user.siteIds && user.siteIds.length > 0) {
    if (siteId && user.siteIds.includes(siteId)) {
      effectiveSiteIds = [siteId]
    } else {
      effectiveSiteIds = user.siteIds
    }
  } else if (siteId) {
    effectiveSiteIds = [siteId]
  }

  // Evaluamos si el usuario es un Administrador Global (NIVEL 1) para mostrarle las solicitudes eliminadas
  const userWithRoles = await prisma.user.findUnique({
    where: { id: user.id },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  
  // NIVEL 2 (con dependencia asignada) NO debe ver eliminados. Solo Nivel 1 (Sin dependencia y con GLOBAL_ACCESS).
  const isGodMode = !user.dependencyId && (userWithRoles?.role?.permissions?.some(p => 
    p.module.code === 'GLOBAL_ACCESS'
  ) || false)

  return dinerRequestService.getRequestsByDateRange(startDate, endDate, filterByDependencyId, filterBySubdependencyIds, isGodMode, effectiveSiteIds)
})
