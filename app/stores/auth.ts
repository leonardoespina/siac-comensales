import { defineStore } from 'pinia'

// Tipos para que TypeScript sepa qué forma tiene nuestro Usuario en el frontend
export interface ModulePermission {
  module: { code: string; name: string }
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface UserState {
  id: number
  cedula: string
  name: string
  warehouseId?: number | null
  diningRoomId?: number | null
  subdependencyId?: number | null
  subdependency?: {
    name: string
    dependencyId: number
    dependency: { name: string }
  } | null
  role: {
    name: string
    permissions: ModulePermission[]
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Variable reactiva para saber si hay sesión iniciada
  // NOTA: Como la cookie ahora es HttpOnly, el frontend no puede leer el token directamente con useCookie('auth_token').
  // Por lo tanto, dependemos de 'user.value' para saber si está autenticado.
  const user = ref<UserState | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  function setAuth(userData: UserState | null) {
    user.value = userData
  }

  async function logout() {
    // Para borrar la cookie HttpOnly, debemos llamar a un endpoint (o recargar y borrar local state)
    // O mejor, crear un endpoint /api/auth/logout que limpie la cookie.
    user.value = null
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    navigateTo('/login')
  }

  async function login(cedula: string, password: string) {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { cedula, password }
    })
    setAuth(response.user)
  }

  // Método: Hidratar estado del usuario (cuando se recarga la página)
  async function fetchUser() {
    try {
      // Usar useRequestFetch para reenviar la cookie HttpOnly durante SSR (SSR cookie forwarding)
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      const data = await fetcher('/api/auth/me')
      user.value = data.user
      return true
    } catch (error) {
      // Si la petición falla (ej. token expirado o no existe), limpiamos el estado
      user.value = null
      return false
    }
  }

  // Helper interno: Extrae la matriz CRUD de un solo módulo
  function getModulePermissions(moduleCode: string) {
    if (!user.value?.role?.permissions) return null
    return user.value.role.permissions.find(p => p.module.code === moduleCode) || null
  }

  // Helper rápido para verificar un permiso específico
  function hasPermission(moduleCode: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') {
    // Si tiene el permiso GLOBAL_ACCESS y está activo, funciona como un SuperAdmin
    const hasGlobalAccess = getModulePermissions('GLOBAL_ACCESS')
    if (hasGlobalAccess && hasGlobalAccess.canRead) return true 

    const p = getModulePermissions(moduleCode)
    return p ? p[action] : false
  }

  // Método: Cambiar contraseña personal
  async function changePassword(oldPassword: string, newPassword: string) {
    await $fetch('/api/auth/password', {
      method: 'PUT',
      body: { oldPassword, newPassword }
    })
  }

  return {
    user,
    isAuthenticated,
    login,
    setAuth,
    logout,
    fetchUser,
    getModulePermissions,
    hasPermission,
    changePassword
  }
})
