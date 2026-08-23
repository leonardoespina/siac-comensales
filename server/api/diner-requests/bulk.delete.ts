import { defineApiHandler } from '../../utils/handler'
import { requirePermission, hasGlobalTimeBypass } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { createError, readBody } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'delete')
  
  const body = await readBody(event)
  const ids = body.ids as number[]
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error('Debe proveer una lista de IDs para eliminar')
  }

  const hasGlobalBypass = await hasGlobalTimeBypass(userId)
  
  return dinerRequestService.deleteRequestsBulk(ids, hasGlobalBypass)
})
