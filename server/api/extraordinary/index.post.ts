import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'EXTRAORDINARY', 'create')

  const body = await readBody(event)

  // Auto-fill date if not provided
  if (!body.date) {
    body.date = dayjs().format('YYYY-MM-DD')
  }

  const dispatch = await extraordinaryService.createExtraordinaryDispatch(body, userId)

  return {
    success: true,
    message: 'Visita registrada con éxito',
    data: dispatch
  }
})
