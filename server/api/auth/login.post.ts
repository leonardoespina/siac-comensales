import { defineApiHandler } from '../../utils/handler'
import { AuthService } from '../../services/authService'
import { logAudit } from '../../utils/audit'
import { z } from 'zod'
import { useValidatedBody } from 'h3-zod'

const loginSchema = z.object({
  cedula: z.string().min(4, 'Cédula inválida').max(20, 'Cédula muy larga').trim(),
  password: z.string().min(4, 'Contraseña requerida').max(100),
  force: z.boolean().optional().default(false)
})

export default defineApiHandler(async (event) => {
  const body = await useValidatedBody(event, loginSchema)

  const { user, token } = await AuthService.login(body.cedula, body.password, body.force)

  // Setear token en Cookie segura (HttpOnly)
  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 horas
  })

  // Registrar auditoría
  await logAudit(user.id, 'LOGIN', 'AUTH', user.id, body.force ? 'Inicio de sesión (Toma de control forzada)' : 'Inicio de sesión exitoso')

  return {
    user
  }
})
