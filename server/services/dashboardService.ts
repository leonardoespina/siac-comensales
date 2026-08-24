import { DashboardRepository } from '../repository/dashboardRepository'
import type { DashboardMetrics, DashboardUserContext } from '../domain/dashboard'
import dayjs from 'dayjs'

export class DashboardService {
  /**
   * Obtiene las métricas en tiempo real aplicando el aislamiento de 3 niveles.
   */
  static async getMetrics(user: DashboardUserContext): Promise<DashboardMetrics> {
    const todayStr = dayjs().format('YYYY-MM-DD')
    const startDate = new Date(`${todayStr}T00:00:00.000Z`)
    const endDate = new Date(`${todayStr}T23:59:59.999Z`)

    // 1. Construir cláusula WHERE para comensales registrados
    const dinerWhere: any = {}
    if (!user.isGlobal) {
      if (user.subdependencyId) {
        dinerWhere.subdependencyId = user.subdependencyId
      } else if (user.dependencyId) {
        dinerWhere.subdependency = { dependencyId: user.dependencyId }
      }
    }

    // 2. Construir cláusula WHERE para peticiones del día de hoy
    const requestBaseWhere: any = {
      request: {
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        status: { not: 'REJECTED' }
      }
    }

    let requestWhere: any = { ...requestBaseWhere }

    if (!user.isGlobal) {
      if (user.subdependencyId) {
        requestWhere = {
          ...requestBaseWhere,
          OR: [
            { request: { ...requestBaseWhere.request, targetSubdependencyId: user.subdependencyId } },
            { diner: { subdependencyId: user.subdependencyId } }
          ]
        }
      } else if (user.dependencyId) {
        requestWhere = {
          ...requestBaseWhere,
          OR: [
            { request: { ...requestBaseWhere.request, targetSubdependency: { dependencyId: user.dependencyId } } },
            { diner: { subdependency: { dependencyId: user.dependencyId } } }
          ]
        }
      }
    }

    // 3. Ejecutar consultas en paralelo en la BD
    const [registeredDiners, todayRequests, todayDispatched] = await Promise.all([
      DashboardRepository.countDiners(dinerWhere),
      DashboardRepository.countRequestDetails(requestWhere),
      DashboardRepository.countDispatchedDetails(requestWhere)
    ])

    return {
      registeredDiners,
      todayRequests,
      todayDispatched
    }
  }
}
