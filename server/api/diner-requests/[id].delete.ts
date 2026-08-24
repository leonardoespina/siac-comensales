import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext, hasGlobalTimeBypass } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { dinerRequestRepository } from '../../repository/dinerRequestRepository'
import { createError } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'delete')
  const userContext = await requireUserContext(event)
  const id = parseInt(event.context.params?.id || '0', 10)
  
  if (!id) throw new Error('ID inválido')

  const hasGlobalBypass = await hasGlobalTimeBypass(userId)
  
  const request = await dinerRequestRepository.findById(id)
  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada' })
  }

  return dinerRequestService.deleteRequest(id, request.date, hasGlobalBypass, userContext)
})
