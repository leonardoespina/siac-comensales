import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'
import { prisma } from '../../utils/prisma'
import { ForbiddenError, ValidationError, NotFoundError } from '../../domain/errors'
import { emitEvent } from '../../utils/eventBus'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS', 'delete')
  const user = await requireUserContext(event)
  const dinerId = Number(event.context.params?.id)

  if (isNaN(dinerId)) {
    throw new ValidationError('ID de comensal inválido')
  }

  // 2. Obtener el comensal actual
  const currentDiner = await prisma.diner.findUnique({
    where: { id: dinerId }
  })

  if (!currentDiner || !currentDiner.active) {
    throw new NotFoundError('Comensal', String(dinerId))
  }

  // 3. Aislamiento Multi-Tenant (Seguridad)
  if (!user.isGlobal) {
    if (user.subdependencyId && currentDiner.subdependencyId !== user.subdependencyId) {
      throw new ForbiddenError('No tienes permiso para eliminar un comensal de otra área.')
    }
    // Si es gerente, el comensal debe pertenecer a una subdependencia de su gerencia
    if (user.dependencyId && !user.subdependencyId) {
      const dinerSub = await prisma.subdependency.findUnique({ where: { id: currentDiner.subdependencyId }})
      if (dinerSub?.dependencyId !== user.dependencyId) {
        throw new ForbiddenError('No tienes permiso para eliminar un comensal fuera de tu Gerencia.')
      }
    }
  }

  // 4. Soft Delete
  const deleted = await dinerRepo.deleteDiner(dinerId)
  emitEvent('diner:deleted', { id: dinerId })
  return deleted
})
