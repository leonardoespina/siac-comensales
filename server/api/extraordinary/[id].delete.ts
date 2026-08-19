import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'

export default defineApiHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const user = await requireUserContext(event)

  await extraordinaryService.deleteExtraordinaryDispatch(id, user.id)

  return {
    success: true,
    message: 'Visita eliminada exitosamente'
  }
})
