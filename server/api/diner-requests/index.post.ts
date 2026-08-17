import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { dinerRequestService } from '../../services/dinerRequestService'
import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS_REQUESTS', 'create')
  
  // Verificamos si el usuario tiene el permiso bypass (ej. Gerente de comedor)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  const hasGlobalBypass = user.role?.permissions.some(p => 
    (p.module.code === 'DINING_ROOMS' && p.can_update) || 
    (p.module.code === 'GLOBAL_ACCESS' && p.can_update)
  ) || false

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
