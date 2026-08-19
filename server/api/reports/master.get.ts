import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as reportService from '../../services/reportService'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const user = await requireUserContext(event)

  const result = await reportService.generateMasterReport(query, user)

  return result
})
