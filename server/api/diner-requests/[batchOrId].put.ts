import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext, hasGlobalTimeBypass } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'update')
  const userContext = await requireUserContext(event)
  
  const batchOrId = event.context.params?.batchOrId
  if (!batchOrId) throw new Error('Identificador no provisto')

  const hasGlobalBypass = await hasGlobalTimeBypass(userId)
  const body = await readBody(event)
  
  return dinerRequestService.updateRequestBatch(batchOrId, {
    dates: body.dates,
    targetSubdependencyId: body.targetSubdependencyId,
    diningRoomId: body.diningRoomId || null,
    shifts: body.shifts
  }, userId, hasGlobalBypass, userContext)
})
