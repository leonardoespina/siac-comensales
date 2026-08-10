import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { SiteService } from '../../services/siteService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SITES', 'canUpdate')
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID de sede inválido' })

  const body = await readBody(event)
  return await SiteService.updateSite(id, body)
})
