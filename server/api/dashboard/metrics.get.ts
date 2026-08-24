import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import { DashboardService } from '../../services/dashboardService'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  return await DashboardService.getMetrics(user)
})
