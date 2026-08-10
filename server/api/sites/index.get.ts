import { defineApiHandler } from '../../utils/handler'
import { requireUserContext } from '../../utils/auth'
import { SiteService } from '../../services/siteService'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  return await SiteService.getAllSites(user.isGlobal)
})
