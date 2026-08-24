import { defineApiHandler } from '../../utils/handler'
import { requireAnyPermission, requireUserContext } from '../../utils/auth'
import * as reportService from '../../services/reportService'

export default defineApiHandler(async (event) => {
  await requireAnyPermission(event, ['REPORT_SUMMARY', 'REPORT_DASHBOARD'], 'read')
  const user = await requireUserContext(event)
  const query = getQuery(event)

  return await reportService.generateSummaryReport(query, user)
})
