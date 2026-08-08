import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { positionService } from '../../services/positionService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'POSITIONS', 'create')
  const body = await readBody(event)
  return positionService.createPosition(body)
})
