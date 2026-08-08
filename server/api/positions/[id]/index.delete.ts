import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import { positionService } from '../../../services/positionService'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'POSITIONS', 'delete')
  const id = Number(event.context.params?.id)
  return positionService.deletePosition(id)
})
