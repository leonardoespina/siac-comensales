import { prisma } from '../utils/prisma'

export interface MasterReportFilters {
  dateFrom: Date
  dateTo: Date
  siteId?: number
  diningRoomId?: number
  shiftType?: string
  status?: string
  dependencyId?: number
  subdependencyId?: number
}

export interface SecurityContext {
  dependencyId?: number | null
  subdependencyId?: number | null
  subdependencyIds?: number[] | null
}

export async function getConsolidatedReport(filters: MasterReportFilters, security: SecurityContext) {
  const whereClause: any = {
    request: {
      date: {
        gte: filters.dateFrom,
        lte: filters.dateTo
      },
      deletedAt: null
    }
  }

  // Si hay RLS o filtros de dependencia, inicializamos diner.subdependency
  if (filters.dependencyId || filters.subdependencyId || security.dependencyId || security.subdependencyId || (security.subdependencyIds && security.subdependencyIds.length > 0)) {
    whereClause.diner = { subdependency: {} }
  }

  // Filters
  if (filters.diningRoomId !== undefined && filters.diningRoomId !== null) {
    whereClause.request.diningRoomId = filters.diningRoomId
  } else if (filters.siteId !== undefined && filters.siteId !== null) {
    whereClause.request.diningRoom = { siteId: filters.siteId }
  }

  if (filters.shiftType) {
    whereClause.request.shiftType = filters.shiftType
  }
  if (filters.status) {
    if (filters.status === 'DESPACHADAS') {
      whereClause.dispatchedAt = { not: null }
    } else if (filters.status === 'APPROVED') {
      whereClause.request.status = 'APPROVED'
      whereClause.dispatchedAt = null
    } else {
      whereClause.request.status = filters.status
    }
  }

  if (filters.dependencyId) {
    whereClause.diner.subdependency.dependencyId = filters.dependencyId
  }
  if (filters.subdependencyId) {
    whereClause.diner.subdependencyId = filters.subdependencyId
  }

  // RLS (Security Context overrides filters if set)
  if (security.subdependencyIds && security.subdependencyIds.length > 0) {
    whereClause.diner.subdependencyId = { in: security.subdependencyIds }
  } else if (security.subdependencyId) {
    whereClause.diner.subdependencyId = security.subdependencyId
  } else if (security.dependencyId) {
    whereClause.diner.subdependency.dependencyId = security.dependencyId
  }

  return await prisma.dinerRequestDetail.findMany({
    where: whereClause,
    include: {
      request: {
        include: {
          diningRoom: true,
          targetSubdependency: {
            include: {
              dependency: true
            }
          }
        }
      },
      diner: {
        include: {
          subdependency: {
            include: {
              dependency: true
            }
          }
        }
      }
    },
    orderBy: [
      { request: { date: 'desc' } },
      { request: { batchCode: 'desc' } }
    ]
  })
}

export async function getApprovedExtraordinaryForReport(filters: MasterReportFilters, security: SecurityContext) {
  const whereClause: any = {
    status: 'APPROVED',
    deletedAt: null,
    date: {
      gte: filters.dateFrom,
      lte: filters.dateTo
    }
  }

  if (filters.diningRoomId !== undefined && filters.diningRoomId !== null) {
    whereClause.diningRoomId = filters.diningRoomId
  } else if (filters.siteId !== undefined && filters.siteId !== null) {
    whereClause.diningRoom = { siteId: filters.siteId }
  }

  if (filters.shiftType) {
    whereClause.shiftType = filters.shiftType
  }

  // Security Context or Filters for subdependency/dependency
  const effectiveSubdepId = security.subdependencyId || filters.subdependencyId
  const effectiveDepId = security.dependencyId || filters.dependencyId

  if (security.subdependencyIds && security.subdependencyIds.length > 0) {
    whereClause.subdependencyId = { in: security.subdependencyIds }
  } else if (effectiveSubdepId) {
    whereClause.subdependencyId = effectiveSubdepId
  } else if (effectiveDepId) {
    whereClause.OR = [
      { dependencyId: effectiveDepId },
      { subdependency: { dependencyId: effectiveDepId } }
    ]
  }

  return await prisma.extraordinaryDispatch.findMany({
    where: whereClause,
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: {
        include: {
          dependency: true
        }
      }
    },
    orderBy: [
      { date: 'desc' },
      { id: 'desc' }
    ]
  })
}

export async function getSummaryCatalog() {
  return await prisma.dependency.findMany({
    where: { active: true },
    include: {
      subdependencies: {
        where: { active: true },
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })
}
