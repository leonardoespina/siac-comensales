import { useAuthStore } from '~/stores/auth'

/**
 * Composable global para verificar permisos en las vistas de Vue (Quasar).
 * Sirve para ocultar botones o bloquear pantallas enteras de forma sencilla.
 */
export const usePermissions = () => {
  const auth = useAuthStore()

  /**
   * Verifica si el usuario tiene permiso para realizar una acción en un módulo.
   * Uso en Vue: v-if="can('PRODUCTS', 'create')"
   */
  const can = (moduleCode: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
    // 1. Si no hay sesión iniciada, bloqueado.
    if (!auth.isAuthenticated) return false

    // 2. Si el rol es el Administrador maestro, tiene acceso total a todo
    if (auth.user?.role?.name === 'ADMIN') return true

    // 3. Extraemos la configuración de este módulo específico desde la memoria (Pinia)
    const perm = auth.getModulePermissions(moduleCode)
    
    // Si la matriz ni siquiera tiene asignado el módulo para este rol, bloqueado.
    if (!perm) return false

    // 4. Retornamos la bandera exacta que pide
    switch (action) {
      case 'create': return perm.canCreate
      case 'read':   return perm.canRead
      case 'update': return perm.canUpdate
      case 'delete': return perm.canDelete
      default:       return false
    }
  }

  return {
    can
  }
}
