import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import { getRouterParam } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'EXTRAORDINARY', 'delete')

  const paramId = getRouterParam(event, 'id')
  const id = parseInt(paramId || '0', 10)
  if (!id) throw new Error('ID inválido')

  await extraordinaryService.deleteExtraordinaryDispatch(id, userId)

  return {
    success: true,
    message: 'Visita eliminada exitosamente'
  }
})
