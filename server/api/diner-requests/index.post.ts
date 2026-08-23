import { defineApiHandler } from '../../utils/handler'
import { requirePermission, hasGlobalTimeBypass } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'create')
  const hasGlobalBypass = await hasGlobalTimeBypass(userId)
  const body = await readBody(event)
  
  return dinerRequestService.createRequests({
    dates: body.dates, // Array de fechas 'YYYY-MM-DD'
    shiftType: body.shiftType,
    targetSubdependencyId: body.targetSubdependencyId,
    diningRoomId: body.diningRoomId || null,
    diners: body.diners,
    batchCode: body.batchCode
  }, userId, hasGlobalBypass)
})
