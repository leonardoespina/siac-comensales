import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError(['ID de comensal inválido'])

  const body = await readBody(event)
  if (!body.templates || !Array.isArray(body.templates) || body.templates.length === 0) {
    throw new ValidationError(['Debe proporcionar al menos un template de huella válido'])
  }

  const record = await dinerRepo.saveBiometricRecord(id, body.templates)
  return record
})
