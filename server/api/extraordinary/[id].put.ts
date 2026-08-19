import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'

export default defineApiHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const user = await requireUserContext(event)

  const updatedRecord = await extraordinaryService.updateExtraordinaryDispatch(id, body, user.id)

  return {
    success: true,
    message: 'Visita actualizada exitosamente',
    data: updatedRecord
  }
})
