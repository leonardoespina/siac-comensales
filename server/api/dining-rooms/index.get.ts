import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import * as diningRoomRepo from '../../repository/diningRoomRepository'
import { getQuery } from 'h3'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const query = getQuery(event)
  
  // Si el frontend envía un filtro explícito por query param (ej. en un reporte o selector específico), lo respetamos.
  // De lo contrario, NO restringimos por las sedes del usuario, permitiendo elegir cualquier comedor activo.
  const siteId = query.siteId ? Number(query.siteId) : undefined
  const siteIds = siteId ? [siteId] : undefined
  const includeInactive = user.isGlobal && query.includeInactive === 'true'

  return await diningRoomRepo.listAll(includeInactive, siteIds)
})
