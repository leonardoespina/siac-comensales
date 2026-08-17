import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { createError, readBody } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'delete')
  
  const body = await readBody(event)
  const ids = body.ids as number[]
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error('Debe proveer una lista de IDs para eliminar')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  const hasGlobalBypass = user?.role?.permissions?.some(p => 
    (p.module.code === 'DINING_ROOMS' && p.can_update) || 
    (p.module.code === 'GLOBAL_ACCESS' && p.can_update)
  ) || false
  
  return dinerRequestService.deleteRequestsBulk(ids, hasGlobalBypass)
})
