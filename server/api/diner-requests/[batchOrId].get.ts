import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS_REQUESTS', 'read')
  const batchOrId = event.context.params?.batchOrId
  if (!batchOrId) throw new Error('Identificador no provisto')

  return await dinerRequestService.getBatchDetails(batchOrId)
})
