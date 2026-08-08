import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requirePermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS', 'create')
  
  const body = await readBody(event)
  if (!body.name) {
    throw createError({ statusCode: 400, message: 'El nombre del comedor es requerido' })
  }

  const created = await repo.createDiningRoom(body.name)

  await logAudit(userId, 'CREAR', 'COMEDOR', created.id, `Comedor creado: ${created.name}`)

  return created
})
