import { defineApiHandler } from '../../utils/handler'
import { requireAuth } from '../../utils/auth'
import { positionService } from '../../services/positionService'

export default defineApiHandler(async (event) => {
  // Cualquier usuario autenticado puede leer el catálogo para usarlo en formularios
  await requireAuth(event)
  return positionService.getAllPositions()
})
