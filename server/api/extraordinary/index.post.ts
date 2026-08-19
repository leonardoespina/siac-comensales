import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import dayjs from 'dayjs'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const user = await requireUserContext(event)

  // Auto-fill date if not provided
  if (!body.date) {
    body.date = dayjs().format('YYYY-MM-DD')
  }

  const dispatch = await extraordinaryService.createExtraordinaryDispatch(body, user.id, user.diningRoomId || undefined)

  return {
    success: true,
    message: 'Visita registrada con éxito',
    data: dispatch
  }
})
