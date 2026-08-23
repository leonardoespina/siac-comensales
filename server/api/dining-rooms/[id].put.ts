import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requireAnyPermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'
import { DomainError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  const user = await requireAnyPermission(event, ['DINING_ROOMS', 'DINERS'], 'update')
  const userId = user.userId
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new DomainError('ID de comedor inválido', 'INVALID_ID', 400)

  const body = await readBody(event)
  if (!body.name || body.siteId === undefined || body.siteId === null) {
    throw new DomainError('El nombre del comedor y la sede son requeridos', 'VALIDATION_ERROR', 400)
  }

  const updated = await repo.updateDiningRoom(id, body.name, Number(body.siteId), body.active)

  await logAudit(userId, 'ACTUALIZAR', 'COMEDOR', updated.id, `Comedor actualizado: ${updated.name}`)

  return updated
})
