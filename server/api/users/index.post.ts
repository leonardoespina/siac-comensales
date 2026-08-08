import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, ConflictError, UnauthorizedError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import bcrypt from 'bcryptjs'

export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)

  const body = await readBody(event)
  if (!body.cedula || !body.name || !body.roleId) {
    throw new ValidationError('Cédula, nombre y rol son requeridos')
  }

  const existing = await prisma.user.findUnique({ where: { cedula: body.cedula } })
  if (existing) throw new ConflictError('Usuario', 'Ya existe un usuario con esa cédula')

  // Asignar contraseña estándar: 123456
  const passwordHash = await bcrypt.hash('123456', 10)

  const newUser = await prisma.user.create({
    data: {
      cedula: body.cedula,
      name: body.name,
      roleId: parseInt(body.roleId),
      warehouseId: body.warehouseId ? parseInt(body.warehouseId) : null,
      dependencyId: body.dependencyId ? parseInt(body.dependencyId) : null,
      subdependencyId: body.subdependencyId ? parseInt(body.subdependencyId) : null,
      passwordHash,
      active: true
    },
    include: { role: { select: { id: true, name: true } } }
  })

  await logAudit(admin.id, 'CREATE', 'USER', newUser.id, `Usuario creado: ${newUser.cedula}`)
  
  const { passwordHash: _, ...safeUser } = newUser
  return safeUser
})
