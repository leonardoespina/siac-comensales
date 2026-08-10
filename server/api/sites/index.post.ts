import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { SiteService } from '../../services/siteService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SITES', 'canCreate')
  const body = await readBody(event)
  return await SiteService.createSite(body)
})
