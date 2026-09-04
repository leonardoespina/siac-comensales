import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'EXTRAORDINARY', 'create')
  const user = await requireUserContext(event)

  const body = await readBody(event)

  // Auto-fill date if not provided
  if (!body.date) {
    body.date = dayjs().format('YYYY-MM-DD')
  }

  const dispatch = await extraordinaryService.createExtraordinaryDispatch(body, user.id, undefined, user)

  return {
    success: true,
    message: 'Visita registrada con éxito',
    data: dispatch
  }
})
