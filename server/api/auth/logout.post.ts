import { defineApiHandler } from '../../utils/handler'

export default defineApiHandler(async (event) => {
  // Limpiamos la cookie seteándola con una fecha de expiración en el pasado
  deleteCookie(event, 'auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  return { message: 'Sesión cerrada exitosamente' }
})
