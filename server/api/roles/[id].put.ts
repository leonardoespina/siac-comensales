import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError, UnauthorizedError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'

export default defineApiHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID de rol inválido')

  const body = await readBody(event)
  
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) throw new NotFoundError('Rol', id.toString())

  // Transacción: Borramos los permisos viejos y creamos los nuevos
  const permissionsData = body.permissions ? body.permissions.map((p: any) => ({
    moduleId: p.moduleId,
    canCreate: !!p.canCreate,
    canRead: !!p.canRead,
    canUpdate: !!p.canUpdate,
    canDelete: !!p.canDelete
  })) : []

  const updatedRole = await prisma.$transaction(async (tx) => {
    // Actualizar datos básicos
    await tx.role.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description
      }
    })

    // Recrear permisos
    await tx.rolePermission.deleteMany({ where: { roleId: id } })
    
    if (permissionsData.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionsData.map((p: any) => ({ ...p, roleId: id }))
      })
    }

    // Retornar el rol actualizado con todo
    return await tx.role.findUnique({
      where: { id },
      include: { permissions: { include: { module: true } } }
    })
  })

  await logAudit(user.id, 'UPDATE', 'ROLE', id, `Rol actualizado: ${updatedRole?.name}`)
  
  return updatedRole
})
