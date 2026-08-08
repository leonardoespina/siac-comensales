import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError, ConflictError, UnauthorizedError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID de rol inválido')

  const role = await prisma.role.findUnique({ 
    where: { id },
    include: { _count: { select: { users: true } } }
  })
  
  if (!role) throw new NotFoundError('Rol', id.toString())

  // Regla de negocio: No se puede borrar un rol si tiene usuarios asignados
  if (role._count.users > 0) {
    throw new ConflictError('Rol', 'No se puede eliminar este rol porque hay usuarios usándolo. Reasigna a los usuarios primero.')
  }

  await prisma.role.delete({ where: { id } })

  await logAudit(user.id, 'DELETE', 'ROLE', id, `Rol eliminado: ${role.name}`)
  
  return { success: true, message: 'Rol eliminado correctamente' }
})
