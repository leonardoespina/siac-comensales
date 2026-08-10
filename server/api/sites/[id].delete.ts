import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { SiteService } from '../../services/siteService'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SITES', 'canDelete')
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID de sede inválido' })

  // Soft delete invirtiendo el estado activo
  const body = await readBody(event)
  const active = body?.active ?? false

  return await SiteService.toggleSiteStatus(id, active)
})
