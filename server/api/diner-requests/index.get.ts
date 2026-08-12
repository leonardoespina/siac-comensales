import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { getQuery } from 'h3'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS_REQUESTS', 'read')
  
  const query = getQuery(event)
  const startDate = query.startDate as string
  const endDate = query.endDate as string
  
  if (!startDate || !endDate) {
    throw new Error('Debe proveer startDate y endDate')
  }

  return dinerRequestService.getRequestsByDateRange(startDate, endDate)
})
