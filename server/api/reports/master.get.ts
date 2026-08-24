import { defineApiHandler } from '../../utils/handler'
import { requireUserContext, requireAnyPermission } from '../../utils/auth'
import * as reportService from '../../services/reportService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  await requireAnyPermission(event, ['REPORT_MASTER', 'REPORT_DASHBOARD'], 'read')
  const user = await requireUserContext(event)

  const result = await reportService.generateMasterReport(query, user)

  return result
})
