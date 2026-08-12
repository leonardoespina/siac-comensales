import { defineApiHandler } from '../../utils/handler'
import { requireAdmin } from '../../utils/auth'
import * as userService from '../../services/userService'

export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)

  // Delegar toda la lógica de negocio al servicio
  return await userService.registerUser(body, admin.id)
})
