import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, ConflictError, UnauthorizedError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody(event)
  if (!body.name) throw new ValidationError('El nombre del rol es requerido')

  const existing = await prisma.role.findUnique({ where: { name: body.name } })
  if (existing) throw new ConflictError('Rol', 'Ya existe un rol con ese nombre')

  // Esperamos que body.permissions sea un array: [{ moduleId: 1, canCreate: true, ... }]
  const permissionsData = body.permissions ? body.permissions.map((p: any) => ({
    moduleId: p.moduleId,
    canCreate: !!p.canCreate,
    canRead: !!p.canRead,
    canUpdate: !!p.canUpdate,
    canDelete: !!p.canDelete
  })) : []

  const newRole = await prisma.role.create({
    data: {
      name: body.name,
      description: body.description,
      permissions: {
        create: permissionsData
      }
    },
    include: {
      permissions: { include: { module: true } }
    }
  })

  await logAudit(user.id, 'CREATE', 'ROLE', newRole.id, `Rol creado: ${newRole.name}`)
  
  return newRole
})
