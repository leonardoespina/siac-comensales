import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError, NotFoundError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  
  const cedula = event.context.params?.cedula
  if (!cedula) throw new ValidationError(['Cédula es requerida'])

  const diner = await dinerRepo.getDinerByCedula(cedula as string)
  
  if (!diner) {
    throw new NotFoundError('Comensal', cedula)
  }

  return diner
})
