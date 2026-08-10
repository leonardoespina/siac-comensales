import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requirePermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS', 'create')
  
  const body = await readBody(event)
  if (!body.name || !body.siteId) {
    throw createError({ statusCode: 400, message: 'El nombre del comedor y la sede son requeridos' })
  }

  const created = await repo.createDiningRoom(body.name, Number(body.siteId))

  await logAudit(userId, 'CREAR', 'COMEDOR', created.id, `Comedor creado: ${created.name}`)

  return created
})
