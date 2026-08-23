import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as reportService from '../../services/reportService'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_DASHBOARD', 'read')
  const user = await requireUserContext(event)
  const query = getQuery(event)

  return await reportService.generateSummaryReport(query, user)
})
