import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError, UnauthorizedError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  if (id === admin.id) {
    throw new ConflictError('Usuario', 'No puedes eliminar tu propio usuario activo')
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('Usuario', id.toString())

  // Borrado lógico (desactivar) para no romper el historial de auditoría
  await prisma.user.update({
    where: { id },
    data: { active: false }
  })

  await logAudit(admin.id, 'DELETE', 'USER', id, `Usuario desactivado (borrado lógico): ${user.cedula}`)
  
  return { success: true, message: 'Usuario desactivado correctamente' }
})
