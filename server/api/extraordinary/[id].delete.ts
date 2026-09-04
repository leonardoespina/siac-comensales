import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import { getRouterParam } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'EXTRAORDINARY', 'delete')
  const user = await requireUserContext(event)

  const paramId = getRouterParam(event, 'id')
  const id = parseInt(paramId || '0', 10)
  if (!id) throw new Error('ID inválido')

  await extraordinaryService.deleteExtraordinaryDispatch(id, user.id, user)

  return {
    success: true,
    message: 'Visita eliminada exitosamente'
  }
})
