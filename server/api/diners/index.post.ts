import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'
import { prisma } from '../../utils/prisma'
import { ForbiddenError, ValidationError } from '../../domain/errors'
import { emitEvent } from '../../utils/eventBus'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS', 'create')
  const user = await requireUserContext(event)
  const body = await readBody(event)

  const squadId = Number(body.squadId)
  const diningRoomId = Number(body.diningRoomId)

  if (!squadId || !body.cedula || !body.name || !diningRoomId) {
    throw new ValidationError('Cédula, nombre, cuadrilla y comedor son obligatorios.')
  }

  // Sanitizar cédula (Remover letras, guiones, espacios. Conservar solo números)
  body.cedula = String(body.cedula).replace(/\D/g, '')

  // 2. Aislamiento Multi-Tenant (Seguridad)
  let targetSubdependencyId = user.subdependencyId
  
  if (body.subdependencyId) {
    if (user.isGlobal) {
      targetSubdependencyId = Number(body.subdependencyId)
    } else if (user.dependencyId && !user.subdependencyId) {
      // Es un Gerente, verificamos que la subdependencia le pertenezca
      const reqSub = await prisma.subdependency.findUnique({
        where: { id: Number(body.subdependencyId) }
      })
      if (reqSub && reqSub.dependencyId === user.dependencyId) {
        targetSubdependencyId = reqSub.id
      } else {
        throw new ForbiddenError('La subdependencia seleccionada no pertenece a tu Gerencia.')
      }
    }
  }

  if (!targetSubdependencyId) {
    throw new ForbiddenError('Tu usuario no está asignado a ninguna subdependencia. No puedes agregar comensales.')
  }

  // 3. Validar duplicados por cédula
  const existingDiner = await prisma.diner.findUnique({
    where: { cedula: body.cedula }
  })

  if (existingDiner) {
    throw new ValidationError('Ya existe un comensal registrado con esta cédula.')
  }

  const newDiner = await dinerRepo.createDiner({
    cedula: body.cedula,
    name: body.name,
    rationType: body.rationType,
    squadId: Number(body.squadId),
    subdependencyId: targetSubdependencyId,
    diningRoomId,
    positionId: body.positionId ? Number(body.positionId) : undefined
  })

  emitEvent('diner:created', { diner: newDiner })

  return newDiner
})
