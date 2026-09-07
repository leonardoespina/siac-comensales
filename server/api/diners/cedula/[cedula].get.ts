import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError, NotFoundError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  
  const cedula = event.context.params?.cedula
  if (!cedula) throw new ValidationError(['Cédula es requerida'])

  const person = await dinerRepo.getDinerOrUserByCedula(cedula as string)
  
  if (!person) {
    throw new NotFoundError('Comensal o Trabajador', cedula)
  }

  return person
})
