import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requirePermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DINERS', 'delete')
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID de comedor inválido' })

  const deleted = await repo.toggleStatus(id, false)

  await logAudit(userId, 'ELIMINAR', 'COMEDOR', deleted.id, `Comedor desactivado (soft-delete): ${deleted.name}`)

  return { success: true, message: 'Comedor desactivado correctamente' }
})
