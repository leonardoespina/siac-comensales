import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { importDinersFromExcel } from '../../services/dinerService'

export default defineApiHandler(async (event) => {
  // 1. Verificación de permisos
  await requirePermission(event, 'DINERS', 'create')
  const user = await requireUserContext(event)
  
  const body = await readBody(event)
  const rows = body.rows as Array<any>
  
  const results = await importDinersFromExcel(rows, user)

  return { success: true, count: results.length }
})
