import { defineApiHandler } from '../../utils/handler'
import { getRequestURL } from 'h3'

export default defineApiHandler(async (event) => {
  // Limpiamos la cookie usando los mismos parámetros con los que fue creada
  deleteCookie(event, 'auth_token', {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax'
  })

  return { message: 'Sesión cerrada exitosamente' }
})
