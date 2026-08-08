import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireUserContext, hasGlobalAccess } from '../../utils/auth'
import { ValidationError } from '../../domain/errors'
import { emitEvent } from '../../utils/eventBus'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const body = await readBody(event)
  
  const targetWarehouseId = hasGlobalAccess(user) ? Number(body.warehouseId) : user.warehouseId

  if (!targetWarehouseId) {
    throw new ValidationError('Debes especificar un comedor para abrir el turno.')
  }

  // REGLA 5: Sin cerrar turno anterior no se abre el siguiente.
  const existingShift = await prisma.shift.findFirst({
    where: {
      warehouseId: targetWarehouseId,
      status: 'OPEN'
    }
  })

  if (existingShift) {
    throw new ValidationError(`Ya existe un turno abierto en este comedor (Iniciado por ID: ${existingShift.userId}). Debes cerrarlo primero.`)
  }

  // Leer parámetros opcionales
  const shiftType = body?.shiftType || 'DIURNO'
  const startTime = body?.startTime ? new Date(body.startTime) : new Date()

  // Abrir nuevo turno
  const shift = await prisma.shift.create({
    data: {
      userId: user.id,
      warehouseId: targetWarehouseId,
      status: 'OPEN',
      shiftType: shiftType,
      startTime: startTime
    },
    include: {
      warehouse: true,
      user: { select: { id: true, name: true } }
    }
  })

  emitEvent('shift:sync', { action: 'create', shift })

  return shift
})
