import * as userRepo from '../repository/userRepository'
import { ValidationError, ConflictError, NotFoundError } from '../domain/errors'
import { logAudit } from '../utils/audit'
import bcrypt from 'bcryptjs'

/**
 * SERVICIO DE USUARIOS
 * Orquesta la lógica de negocio para la gestión de usuarios.
 */

export async function registerUser(body: any, adminId: number) {
  if (!body.cedula || !body.name || !body.roleId) {
    throw new ValidationError('Cédula, nombre y rol son requeridos')
  }

  const existing = await userRepo.findUserByCedula(body.cedula)
  if (existing) throw new ConflictError('Usuario', 'Ya existe un usuario con esa cédula')

  // Asignar contraseña estándar: 123456
  const passwordHash = await bcrypt.hash('123456', 10)

  const subdependencyIds: number[] = Array.isArray(body.subdependencyIds)
    ? body.subdependencyIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    : (body.subdependencyId ? [Number(body.subdependencyId)] : [])

  const newUser = await userRepo.createUser({
    cedula: body.cedula,
    name: body.name,
    passwordHash,
    active: true,
    role: { connect: { id: parseInt(body.roleId) } },
    sites: body.siteIds?.length ? {
      connect: body.siteIds.map((id: number) => ({ id: Number(id) }))
    } : undefined,
    dependency: body.dependencyId ? { connect: { id: parseInt(body.dependencyId) } } : undefined,
    subdependencies: subdependencyIds.length ? {
      connect: subdependencyIds.map((id: number) => ({ id }))
    } : undefined,
    subdependency: subdependencyIds.length ? { connect: { id: subdependencyIds[0] } } : undefined
  })

  await logAudit(adminId, 'CREATE', 'USER', newUser.id, `Usuario creado: ${newUser.cedula}`)
  
  const { passwordHash: _, ...safeUser } = newUser
  return safeUser
}

export async function modifyUser(id: number, body: any, adminId: number) {
  const user = await userRepo.findUserById(id)
  if (!user) throw new NotFoundError('Usuario', id.toString())

  if (body.cedula && body.cedula !== user.cedula) {
    const existing = await userRepo.findUserByCedula(body.cedula)
    if (existing) throw new ConflictError('Usuario', 'Ya existe otro usuario con esa cédula')
  }

  let passwordHash = undefined
  if (body.password && body.password.trim() !== '') {
    passwordHash = await bcrypt.hash(body.password, 10)
  }

  const hasSubdependencies = body.subdependencyIds !== undefined || body.subdependencyId !== undefined
  const subdependencyIds: number[] = Array.isArray(body.subdependencyIds)
    ? body.subdependencyIds.map((subId: any) => Number(subId)).filter((subId: number) => !isNaN(subId))
    : (body.subdependencyId ? [Number(body.subdependencyId)] : [])

  const updatedUser = await userRepo.updateUser(id, {
    cedula: body.cedula,
    name: body.name,
    active: body.active !== undefined ? body.active : undefined,
    ...(passwordHash && { passwordHash }),
    ...(body.roleId !== undefined && { role: { connect: { id: parseInt(body.roleId) } } }),
    ...(body.siteIds !== undefined && { 
      sites: { set: Array.isArray(body.siteIds) ? body.siteIds.map((siteId: number) => ({ id: Number(siteId) })) : [] } 
    }),
    ...(body.dependencyId !== undefined && {
      dependency: body.dependencyId ? { connect: { id: parseInt(body.dependencyId) } } : { disconnect: true }
    }),
    ...(hasSubdependencies && {
      subdependencies: {
        set: subdependencyIds.map((subId: number) => ({ id: subId }))
      },
      subdependency: subdependencyIds.length ? { connect: { id: subdependencyIds[0] } } : { disconnect: true }
    })
  })

  await logAudit(adminId, 'UPDATE', 'USER', id, `Usuario actualizado: ${updatedUser.cedula}`)
  
  const { passwordHash: _, ...safeUser } = updatedUser
  return safeUser
}

export async function removeUser(id: number, adminId: number) {
  if (id === adminId) {
    throw new ConflictError('Usuario', 'No puedes eliminar tu propio usuario activo')
  }

  const user = await userRepo.findUserById(id)
  if (!user) throw new NotFoundError('Usuario', id.toString())

  // Borrado lógico (desactivar) para no romper el historial de auditoría
  await userRepo.deactivateUser(id)

  await logAudit(adminId, 'DELETE', 'USER', id, `Usuario desactivado (borrado lógico): ${user.cedula}`)
  
  return { success: true, message: 'Usuario desactivado correctamente' }
}
