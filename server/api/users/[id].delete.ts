import { defineApiHandler } from '../../utils/handler'
import { requireAdmin } from '../../utils/auth'
import { ValidationError } from '../../domain/errors'
import * as userService from '../../services/userService'

export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  // Delegar la lógica de negocio y auditoría al servicio
  return await userService.removeUser(id, admin.id)
})
