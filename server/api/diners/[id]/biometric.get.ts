import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError(['ID de comensal inválido'])

  const record = await dinerRepo.getBiometricRecord(id)
  if (!record) {
    return { templates: [] }
  }
  return record
})
