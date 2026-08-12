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
  const hasManagerBypass = user?.role?.permissions?.some(p => 
    (p.module.code === 'DINING_ROOMS' && p.canUpdate) || 
    (p.module.code === 'GLOBAL_ACCESS')
  ) || false

  const body = await readBody(event)
  
  return dinerRequestService.createRequests({
    dates: body.dates, // Array de fechas 'YYYY-MM-DD'
    shiftType: body.shiftType,
    isExtraordinary: body.isExtraordinary || false,
    diningRoomId: body.diningRoomId,
    dinerIds: body.dinerIds
  }, userId, hasManagerBypass)
})
