import { prisma } from '../utils/prisma'

export interface MasterReportFilters {
  dateFrom: Date
  dateTo: Date
  diningRoomId?: number
  shiftType?: string
  status?: string
  dependencyId?: number
  subdependencyId?: number
}

export interface SecurityContext {
  dependencyId?: number | null
  subdependencyId?: number | null
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
  if (filters.dependencyId || filters.subdependencyId || security.dependencyId || security.subdependencyId) {
    whereClause.diner = { subdependency: {} }
  }

  // Filters
  if (filters.diningRoomId) {
    whereClause.request.diningRoomId = filters.diningRoomId
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
  if (security.subdependencyId) {
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
