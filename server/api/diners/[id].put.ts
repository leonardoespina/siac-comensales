import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'
import { prisma } from '../../utils/prisma'
import { ForbiddenError, ValidationError, NotFoundError } from '../../domain/errors'
import { emitEvent } from '../../utils/eventBus'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS', 'update')
  const user = await requireUserContext(event)
  const dinerId = Number(event.context.params?.id)
  const body = await readBody(event)

  if (body.cedula) {
    body.cedula = String(body.cedula).replace(/\D/g, '')
  }

  if (isNaN(dinerId)) {
    throw new ValidationError('ID de comensal inválido')
  }

  const diningRoomId = Number(body.diningRoomId)
  if (body.diningRoomId && isNaN(diningRoomId)) {
    throw new ValidationError('ID de comedor inválido')
  }

  // 2. Obtener el comensal actual
  const currentDiner = await prisma.diner.findUnique({
    where: { id: dinerId }
  })

  if (!currentDiner || !currentDiner.active) {
    throw new NotFoundError('Comensal', String(dinerId))
  }

  // 3. Aislamiento Multi-Tenant (Seguridad)
  // Si no es global, verificamos que tenga permisos sobre el comensal
  if (!user.isGlobal) {
    if (user.subdependencyId && currentDiner.subdependencyId !== user.subdependencyId) {
      throw new ForbiddenError('No tienes permiso para editar un comensal de otra área.')
    }
    // Si es gerente, el comensal debe pertenecer a una subdependencia de su gerencia
    if (user.dependencyId && !user.subdependencyId) {
      const dinerSub = await prisma.subdependency.findUnique({ where: { id: currentDiner.subdependencyId }})
      if (dinerSub?.dependencyId !== user.dependencyId) {
        throw new ForbiddenError('No tienes permiso para editar un comensal fuera de tu Gerencia.')
      }
    }
  }

  let finalSubdependencyId = currentDiner.subdependencyId
  if (body.subdependencyId) {
    if (user.isGlobal) {
      finalSubdependencyId = Number(body.subdependencyId)
    } else if (user.dependencyId && !user.subdependencyId) {
      const reqSub = await prisma.subdependency.findUnique({ where: { id: Number(body.subdependencyId) }})
      if (reqSub && reqSub.dependencyId === user.dependencyId) {
        finalSubdependencyId = reqSub.id
      } else {
        throw new ForbiddenError('La subdependencia seleccionada no pertenece a tu Gerencia.')
      }
    }
  }

  // 4. Validar duplicados de cédula si la están cambiando
  if (body.cedula && body.cedula !== currentDiner.cedula) {
    const existingDiner = await prisma.diner.findUnique({
      where: { cedula: body.cedula }
    })
    if (existingDiner) {
      throw new ValidationError('Ya existe un comensal registrado con esta cédula.')
    }
  }

  // 5. Actualizar
  const updatedDiner = await dinerRepo.updateDiner(dinerId, {
    cedula: body.cedula,
    name: body.name,
    rationType: body.rationType,
    squadId: body.squadId ? Number(body.squadId) : undefined,
    subdependencyId: finalSubdependencyId,
    diningRoomId: diningRoomId || undefined,
    positionId: body.positionId ? Number(body.positionId) : undefined
  })

  emitEvent('diner:updated', { diner: updatedDiner })

  return updatedDiner
})
