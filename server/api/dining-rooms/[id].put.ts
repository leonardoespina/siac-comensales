import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requirePermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS', 'update')
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID de comedor inválido' })

  const body = await readBody(event)
  if (!body.name) {
    throw createError({ statusCode: 400, message: 'El nombre del comedor es requerido' })
  }

  const updated = await repo.updateDiningRoom(id, body.name, body.active)

  await logAudit(userId, 'ACTUALIZAR', 'COMEDOR', updated.id, `Comedor actualizado: ${updated.name}`)

  return updated
})
