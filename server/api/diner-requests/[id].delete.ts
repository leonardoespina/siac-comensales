import { defineApiHandler } from '../../utils/handler'
import { requirePermission, hasGlobalTimeBypass } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { dinerRequestRepository } from '../../repository/dinerRequestRepository'
import { createError } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'delete')
  const id = parseInt(event.context.params?.id || '0', 10)
  
  if (!id) throw new Error('ID inválido')

  const hasGlobalBypass = await hasGlobalTimeBypass(userId)
  
  // Buscar la solicitud para obtener su fecha objetivo y validarla contra el Cutoff
  const request = await dinerRequestRepository.findById(id)
  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada' })
  }

  return dinerRequestService.deleteRequest(id, request.date, hasGlobalBypass)
})
