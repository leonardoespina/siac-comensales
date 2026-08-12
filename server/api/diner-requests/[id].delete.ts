import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { dinerRequestRepository } from '../../repository/dinerRequestRepository'
import { createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'delete')
  const id = parseInt(event.context.params?.id || '0', 10)
  
  if (!id) throw new Error('ID inválido')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  const hasManagerBypass = user?.role?.permissions?.some(p => 
    (p.module.code === 'DINING_ROOMS' && p.canUpdate) || 
    (p.module.code === 'GLOBAL_ACCESS')
  ) || false
  
  // Buscar la solicitud para obtener su fecha objetivo y validarla contra el Cutoff
  const request = await dinerRequestRepository.findById(id)
  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada' })
  }

  return dinerRequestService.deleteRequest(id, request.date, request.isExtraordinary, hasManagerBypass)
})
