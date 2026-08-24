import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

/**
 * REPOSITORIO DE DASHBOARD
 * Encapsula todas las consultas de conteo y agregación en PostgreSQL.
 */
export class DashboardRepository {
  /**
   * Cuenta los comensales registrados activos según el filtro de aislamiento.
   */
  static async countDiners(where: Prisma.DinerWhereInput = {}): Promise<number> {
    return prisma.diner.count({
      where: {
        ...where,
        active: true
      }
    })
  }

  /**
   * Cuenta los detalles de solicitudes del día según el filtro de aislamiento.
   */
  static async countRequestDetails(where: Prisma.DinerRequestDetailWhereInput = {}): Promise<number> {
    return prisma.dinerRequestDetail.count({
      where
    })
  }

  /**
   * Cuenta las comidas efectivamente despachadas hoy.
   */
  static async countDispatchedDetails(where: Prisma.DinerRequestDetailWhereInput = {}): Promise<number> {
    return prisma.dinerRequestDetail.count({
      where: {
        ...where,
        dispatchedAt: { not: null }
      }
    })
  }
}
