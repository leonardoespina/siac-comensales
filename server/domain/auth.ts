// ── DOMINIO DE AUTENTICACIÓN Y SESIONES ──────────────────────────────────────
// Regla Hexagonal: Funciones y constantes puras sin dependencias de Prisma ni HTTP.

// Duración de la sesión activa: 24 Horas continuas (1440 minutos)
export const SESSION_INACTIVITY_TIMEOUT_MINUTES = 24 * 60

export interface RolePermissionCheck {
  module: { code: string }
  canRead?: boolean
  canUpdate?: boolean
  canCreate?: boolean
  canDelete?: boolean
}

/**
 * Determina si una sesión sigue activa según su último timestamp de actividad.
 */
export function isSessionActive(lastActiveAt: Date | null, timeoutMinutes = SESSION_INACTIVITY_TIMEOUT_MINUTES): boolean {
  if (!lastActiveAt) return true // Si tiene sesión activa pero fecha nula, asumimos activa
  const diffMinutes = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60)
  return diffMinutes < timeoutMinutes
}

/**
 * Determina si un usuario tiene un rol exento de sesión única.
 * Por política corporativa unificada: NINGÚN usuario puede tener múltiples PCs abiertas a la vez.
 */
export function isDispatchExclusiveRole(permissions?: RolePermissionCheck[]): boolean {
  // Política global estricta: Sesión única para TODOS los usuarios
  return false
}
