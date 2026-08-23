import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/diningRoomRepository'
import { requireAnyPermission } from '../../utils/auth'
import { logAudit } from '../../utils/audit'
import { DomainError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  const user = await requireAnyPermission(event, ['DINING_ROOMS', 'DINERS'], 'delete')
  const userId = user.userId
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new DomainError('ID de comedor inválido', 'INVALID_ID', 400)

  const deleted = await repo.toggleStatus(id, false)

  await logAudit(userId, 'ELIMINAR', 'COMEDOR', deleted.id, `Comedor desactivado (soft-delete): ${deleted.name}`)

  return { success: true, message: 'Comedor desactivado correctamente' }
})
