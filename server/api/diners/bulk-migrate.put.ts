import { defineApiHandler } from '../../utils/handler'
import { bulkMigrate } from '../../services/dinerService'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'update')
  await requireUserContext(event) // Verifica autenticación válida
  
  const body = await readBody(event)
  
  if (!body.dinerIds || !Array.isArray(body.dinerIds)) {
    throw new ValidationError(['Payload inválido, se requiere un arreglo de dinerIds.'])
  }

  const result = await bulkMigrate(body.dinerIds, body.targetDiningRoomId)

  setResponseStatus(event, 200)
  return { 
    success: true, 
    message: `${result.count} comensales migrados exitosamente.`,
    data: result 
  }
})
