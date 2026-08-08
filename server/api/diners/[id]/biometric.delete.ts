import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  // Para borrar huellas se necesita permiso de actualización en el módulo de comensales o de seguridad
  await requirePermission(event, 'DINERS', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError(['ID de comensal inválido'])

  await dinerRepo.clearBiometricRecord(id)
  return { success: true }
})
