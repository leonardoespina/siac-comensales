import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/jwt'
import { logAudit } from '../../utils/audit'
import { UnauthorizedError, NotFoundError, ValidationError } from '../../domain/errors'
import bcrypt from 'bcryptjs'

import { z } from 'zod'
import { useValidatedBody } from 'h3-zod'

const loginSchema = z.object({
  cedula: z.string().min(4, 'Cédula inválida').max(20, 'Cédula muy larga').trim(),
  password: z.string().min(4, 'Contraseña requerida').max(100)
})

export default defineApiHandler(async (event) => {
  // 1. Validar estrictamente el payload usando Zod
  const body = await useValidatedBody(event, loginSchema)
  const cedula = body.cedula
  const password = body.password

  // 2. Buscar al usuario por cédula, incluyendo su Rol y Permisos
  const user = await prisma.user.findUnique({
    where: { cedula },
    include: {
      role: {
        include: {
          permissions: {
            include: { module: true }
          }
        }
      },
      subdependency: {
        select: {
          name: true,
          dependencyId: true,
          dependency: { select: { name: true } }
        }
      }
    }
  })

  if (!user || !user.active) {
    throw new NotFoundError('Usuario', cedula)
  }

  // 3. Verificar contraseña real usando bcryptjs
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    throw new UnauthorizedError('Cédula o contraseña incorrecta')
  }

  // 4. Generar Token JWT
  const token = signToken({ userId: user.id }, '24h')

  // 4.1. Setear token en Cookie segura (HttpOnly)
  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 horas
  })

  // 5. REGISTRAR AUDITORÍA 🔥
  await logAudit(user.id, 'LOGIN', 'AUTH', user.id, 'Inicio de sesión desde la web')

  // 6. Devolver la data al frontend
  const { passwordHash, ...safeUser } = user

  return {
    user: safeUser
  }
})
