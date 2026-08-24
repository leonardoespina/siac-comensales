import { defineApiHandler } from '../../utils/handler'
import { AuthService } from '../../services/authService'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  try {
    const userId = await requireAuth(event)
    await AuthService.logout(userId)
  } catch (e) {
    // Si el token ya era inválido, ignoramos y limpiamos la cookie
  }

  // Limpiamos la cookie seteándola con una fecha de expiración en el pasado
  deleteCookie(event, 'auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  return { message: 'Sesión cerrada exitosamente' }
})
