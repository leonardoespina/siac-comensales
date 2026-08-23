import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as extraordinaryService from '../../services/extraordinaryService'
import { getRouterParam } from 'h3'

export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'EXTRAORDINARY', 'update')

  const paramId = getRouterParam(event, 'id')
  const id = parseInt(paramId || '0', 10)
  if (!id) throw new Error('ID inválido')

  const body = await readBody(event)
  const updatedRecord = await extraordinaryService.updateExtraordinaryDispatch(id, body, userId)

  return {
    success: true,
    message: 'Visita actualizada exitosamente',
    data: updatedRecord
  }
})
