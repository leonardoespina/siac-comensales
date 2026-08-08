import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireUserContext, hasGlobalAccess } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const query = getQuery(event)
  
  // Si el usuario es global, leemos el que envía por URL, sino forzamos su almacén asignado
  const targetWarehouseId = hasGlobalAccess(user) ? Number(query.warehouseId) : user.warehouseId

  if (!targetWarehouseId) return null

  const shift = await prisma.shift.findFirst({
    where: {
      warehouseId: targetWarehouseId,
      status: 'OPEN'
    },
    include: {
      warehouse: true
    }
  })

  return shift || null
})
