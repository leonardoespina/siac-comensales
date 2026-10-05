import { defineApiHandler } from '../../../../utils/handler'
import { requirePermission } from '../../../../utils/auth'
import { requestManualStreamRestart } from '../../../../services/hikvisionService'
import { DomainError } from '../../../../domain/errors'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'DISPATCH', 'create')
  const idStr = event.context.params?.id
  const id = idStr ? parseInt(idStr, 10) : 0

  if (!id || isNaN(id)) {
    throw new DomainError('ID de comedor inválido', 'INVALID_ID', 400)
  }

  return await requestManualStreamRestart(id, userId)
})
