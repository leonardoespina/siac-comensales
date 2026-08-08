import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError, UnauthorizedError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import bcrypt from 'bcryptjs'

export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('Usuario', id.toString())

  if (body.cedula && body.cedula !== user.cedula) {
    const existing = await prisma.user.findUnique({ where: { cedula: body.cedula } })
    if (existing) throw new ConflictError('Usuario', 'Ya existe otro usuario con esa cédula')
  }

  let passwordHash = undefined
  if (body.password && body.password.trim() !== '') {
    passwordHash = await bcrypt.hash(body.password, 10)
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      cedula: body.cedula,
      name: body.name,
      roleId: body.roleId ? parseInt(body.roleId) : undefined,
      warehouseId: body.warehouseId !== undefined ? (body.warehouseId ? parseInt(body.warehouseId) : null) : undefined,
      dependencyId: body.dependencyId !== undefined ? (body.dependencyId ? parseInt(body.dependencyId) : null) : undefined,
      subdependencyId: body.subdependencyId !== undefined ? (body.subdependencyId ? parseInt(body.subdependencyId) : null) : undefined,
      active: body.active !== undefined ? body.active : undefined,
      ...(passwordHash && { passwordHash })
    },
    include: { role: { select: { id: true, name: true } } }
  })

  await logAudit(admin.id, 'UPDATE', 'USER', id, `Usuario actualizado: ${updatedUser.cedula}`)
  
  const { passwordHash: _, ...safeUser } = updatedUser
  return safeUser
})
