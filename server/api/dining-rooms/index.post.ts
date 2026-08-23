import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requireAnyPermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'
import { DomainError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  const user = await requireAnyPermission(event, ['DINING_ROOMS', 'DINERS'], 'create')
  const userId = user.userId
  
  const body = await readBody(event)
  if (!body.name || body.siteId === undefined || body.siteId === null) {
    throw new DomainError('El nombre del comedor y la sede son requeridos', 'VALIDATION_ERROR', 400)
  }

  const created = await repo.createDiningRoom(body.name, Number(body.siteId))

  await logAudit(userId, 'CREAR', 'COMEDOR', created.id, `Comedor creado: ${created.name}`)

  return created
})
