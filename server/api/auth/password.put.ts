import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { ValidationError, UnauthorizedError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import bcrypt from 'bcryptjs'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const body = await readBody(event)

  if (!body.oldPassword || !body.newPassword) {
    throw new ValidationError('Debe proporcionar la contraseña actual y la nueva')
  }

  if (body.newPassword.length < 6) {
    throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres')
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new UnauthorizedError()

  // Verificar que la contraseña anterior coincida
  const isValid = await bcrypt.compare(body.oldPassword, user.passwordHash)
  if (!isValid) {
    throw new ValidationError('La contraseña actual es incorrecta')
  }

  // Encriptar y guardar la nueva
  const newHash = await bcrypt.hash(body.newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash }
  })

  await logAudit(userId, 'UPDATE', 'USER', userId, 'Cambio de contraseña personal')

  return { success: true, message: 'Contraseña actualizada' }
})
