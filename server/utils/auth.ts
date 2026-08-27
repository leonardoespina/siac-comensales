import type { H3Event } from 'h3'
import { verifyToken } from './jwt'
import { UnauthorizedError, ForbiddenError, SessionTerminatedError } from '../domain/errors'
import { isDispatchExclusiveRole } from '../domain/auth'
import { prisma } from './prisma'

// ── PROTECCIÓN DE RUTAS Y PERMISOS DINÁMICOS ──────────────────────────────
// Estas funciones se usarán en todos los endpoints (handlers) que requieran seguridad.

export function hasGlobalAccess(user: { warehouseId?: number | null, siteIds?: number[], roleName?: string }): boolean {
  // Un usuario tiene acceso global a los datos de sedes (ver todo) SOLO si NO tiene sedes o almacenes asignados.
  return !user.warehouseId && (!user.siteIds || user.siteIds.length === 0)
}

/**
 * 1. Verifica que el usuario haya enviado un token JWT válido y que su sesión esté activa.
 * Devuelve el ID del usuario si es exitoso. Lanza 401 si no.
 */
export async function requireAuth(event: H3Event) {
  // Intentamos leer el Header "Authorization: Bearer <token>"
  let token = getHeader(event, 'authorization')?.split(' ')[1]
  
  // Si no hay Header, intentamos leer la cookie nativa (usada por los $fetch de Nuxt)
  if (!token) {
    token = getCookie(event, 'auth_token')
  }
  
  if (!token) {
    throw new UnauthorizedError('Se requiere token de autenticación')
  }

  const decoded = verifyToken(token) as { userId: number; sessionId?: string }
  event.context.auth = decoded

  // Validar sesión contra base de datos
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })

  if (!user || !user.active) {
    throw new UnauthorizedError('Usuario no encontrado o inactivo')
  }

  const isDispatchRole = isDispatchExclusiveRole(user.role?.permissions as any)

  if (!isDispatchRole && user.activeSessionId && decoded.sessionId && decoded.sessionId !== user.activeSessionId) {
    throw new SessionTerminatedError()
  }

  // Actualizar lastActiveAt throttled (si pasaron más de 30s)
  const now = new Date()
  if (!user.lastActiveAt || now.getTime() - new Date(user.lastActiveAt).getTime() > 30000) {
    prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now }
    }).catch(() => {})
  }

  event.context.userRecord = user
  return decoded.userId
}

/**
 * 1.5. Devuelve el contexto completo del usuario (ID, Rol, Warehouse)
 */
export async function requireUserContext(event: H3Event) {
  const userId = await requireAuth(event)
  const user = (event.context.userRecord as any) || await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      role: { include: { permissions: { include: { module: true } } } }, 
      sites: true,
      subdependencies: true
    }
  })
  if (!user) throw new UnauthorizedError('Usuario no encontrado')

  // Obtener sites/subdependencies si no venían precargados
  const fullUser = (user.sites && user.subdependencies) ? user : await prisma.user.findUnique({
    where: { id: userId },
    include: { sites: true, subdependencies: true }
  })

  const subdependencyIds: number[] = fullUser?.subdependencies?.length > 0
    ? fullUser.subdependencies.map((s: any) => s.id)
    : (user.subdependencyId ? [user.subdependencyId] : [])

  return {
    id: user.id,
    roleName: user.role?.name,
    isGlobal: user.role?.permissions?.some((p: any) => p.module.code === 'GLOBAL_ACCESS' && p.canRead) || false,
    warehouseId: user.warehouseId,
    siteIds: fullUser?.sites?.map((s: any) => s.id) || [],
    dependencyId: user.dependencyId,
    subdependencyId: subdependencyIds[0] || user.subdependencyId || null,
    subdependencyIds
  }
}

/**
 * Verifica si el usuario tiene permiso para saltarse las reglas de tiempo (Cutoff)
 */
export async function hasGlobalTimeBypass(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  return user?.role?.permissions?.some(p => 
    p.module.code === 'GLOBAL_ACCESS' && (p.canUpdate || p.canRead)
  ) || false
}

/**
 * 2. Verifica la matriz de permisos de la base de datos (Rol vs Módulo).
 * Ejemplo de uso en un endpoint: await requirePermission(event, 'PRODUCTS', 'create')
 */
export async function requirePermission(
  event: H3Event, 
  moduleCode: string, 
  action: 'create' | 'read' | 'update' | 'delete'
) {
  // Primero verificamos que esté logueado
  const userId = await requireAuth(event)
  
  // Buscamos al usuario en BD y traemos su matriz de permisos SOLO para el módulo solicitado
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            where: {
              OR: [
                { module: { code: moduleCode } },
                { module: { code: 'GLOBAL_ACCESS' } }
              ]
            },
            include: { module: true }
          }
        }
      }
    }
  })

  if (!user || !user.role) {
    throw new ForbiddenError('El usuario no tiene un rol asignado')
  }

  // Si tiene el permiso GLOBAL_ACCESS activo, lo dejamos pasar siempre
  const hasGlobalAccess = user.role.permissions.some(p => p.module.code === 'GLOBAL_ACCESS' && p.canRead)
  if (hasGlobalAccess) {
    return userId
  }

  const modulePerm = user.role.permissions.find(p => p.module.code === moduleCode)

  if (!modulePerm) {
    throw new ForbiddenError(`Tu rol no tiene permisos configurados para el módulo: ${moduleCode}`)
  }

  // Comparamos la acción solicitada con la bandera booleana en la Base de Datos
  const hasAccess = 
    (action === 'create' && modulePerm.canCreate) ||
    (action === 'read' && modulePerm.canRead) ||
    (action === 'update' && modulePerm.canUpdate) ||
    (action === 'delete' && modulePerm.canDelete)

  if (!hasAccess) {
    throw new ForbiddenError(`No tienes permiso para '${action}' en el módulo ${moduleCode}`)
  }

  return userId
}

/**
 * 3. Verifica si el usuario posee al menos UNO de los permisos solicitados.
 */
export async function requireAnyPermission(
  event: H3Event,
  moduleCodes: string[],
  action: 'create' | 'read' | 'update' | 'delete' = 'read'
) {
  const userId = await requireAuth(event)
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

  if (!user || !user.role) {
    throw new ForbiddenError('El usuario no tiene un rol asignado')
  }

  const hasGlobalAccess = user.role.permissions.some(p => p.module.code === 'GLOBAL_ACCESS' && p.canRead)
  if (hasGlobalAccess) {
    return userId
  }

  const hasAccess = user.role.permissions.some(p => {
    if (!moduleCodes.includes(p.module.code)) return false
    if (action === 'create') return p.canCreate
    if (action === 'read') return p.canRead
    if (action === 'update') return p.canUpdate
    if (action === 'delete') return p.canDelete
    return false
  })

  if (!hasAccess) {
    throw new ForbiddenError(`No tienes permiso para acceder a esta función (${moduleCodes.join(', ')})`)
  }

  return userId
}

/**
 * 3. Verifica que el usuario tenga el rol 'ADMIN'.
 * Devuelve el objeto del usuario (con su rol) si es exitoso.
 */
export async function requireAdmin(event: H3Event) {
  const userId = await requireAuth(event)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { module: true } } } } }
  })
  
  const hasGlobalAccess = user?.role?.permissions?.some(p => p.module.code === 'GLOBAL_ACCESS')
  
  if (!hasGlobalAccess) {
    throw new UnauthorizedError('Solo administradores globales pueden realizar esta acción')
  }
  
  return user
}
