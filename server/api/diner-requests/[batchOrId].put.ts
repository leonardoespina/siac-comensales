import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'update')
  
  const batchOrId = event.context.params?.batchOrId
  if (!batchOrId) throw new Error('Identificador no provisto')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  const hasGlobalBypass = user?.role?.permissions?.some(p => 
    (p.module.code === 'DINING_ROOMS' && p.can_update) || 
    (p.module.code === 'GLOBAL_ACCESS' && p.can_update)
  ) || false

  const body = await readBody(event)
  
  return dinerRequestService.updateRequestBatch(batchOrId, {
    dates: body.dates,
    targetSubdependencyId: body.targetSubdependencyId,
    diningRoomId: body.diningRoomId || null,
    shifts: body.shifts
  }, userId, hasGlobalBypass)
})
