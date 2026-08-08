import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { NotFoundError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Validar el token y obtener el userId
  const userId = await requireAuth(event)

  // 2. Traer al usuario completo con sus permisos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { module: true }
          }
        }
      }
    }
  })

  if (!user || !user.active) {
    throw new NotFoundError('Usuario', userId)
  }

  const { passwordHash, ...safeUser } = user

  return { user: safeUser }
})
