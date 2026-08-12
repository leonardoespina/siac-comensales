import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { settingService } from '../../services/settingService'
import { readBody } from 'h3'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SECURITY', 'canUpdate')
  
  const body = await readBody(event)
  if (!Array.isArray(body)) {
    throw new Error('Formato inválido. Se espera un arreglo de configuraciones.')
  }

  return settingService.updateSettings(body)
})
