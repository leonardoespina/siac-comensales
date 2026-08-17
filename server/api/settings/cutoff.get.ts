import { defineApiHandler } from '../../utils/handler'
import { requireAuth } from '../../utils/auth'
import { settingService } from '../../services/settingService'

export default defineApiHandler(async (event) => {
  // Público para usuarios autenticados
  await requireAuth(event)
  
  const minDaysAhead = await settingService.getMinDaysAhead()
  const cutoffTime = await settingService.getCutoffTime()

  return {
    minDaysAhead,
    cutoffTime
  }
})
