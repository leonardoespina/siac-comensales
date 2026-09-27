/**
 * STORE: Biometría Hikvision (SIAC)
 *
 * RESPONSABILIDAD:
 * - Único puente autorizado entre el composable useBiometricManagement y los
 *   endpoints HTTP del backend (/api/biometrics/*).
 * - Mantiene en caché el último resultado de healthcheck y sincronización
 *   para evitar re-fetches innecesarios.
 *
 * REGLAS ARQUITECTÓNICAS:
 * ✅ Setup Pattern (Composition API) con defineStore.
 * ✅ Emite/retorna datos; no lanza modales, no navega, no dispara Toasts.
 * ✅ Actualiza estado local tras POST/GET exitoso (sin re-fetch masivo).
 * ❌ PROHIBIDO importar Prisma, h3, o cualquier lógica de servidor aquí.
 */

import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

// ── TIPOS ─────────────────────────────────────────────────────────────────────

export interface TerminalHealthStatus {
  diningRoomId: number
  diningRoomName: string
  ip: string
  online: boolean
  latencyMs?: number
  checkedAt: Date
}

export interface BiometricSyncTarget {
  diningRoomId: number
  diningRoomName: string
  userSuccess: boolean
  faceSuccess: boolean
  fpSuccess?: boolean
  error?: string
}

export interface BiometricSyncResult {
  dinerId: number
  cedula: string
  name: string
  targets: BiometricSyncTarget[]
  fpSynced?: boolean
  totalSuccess: boolean
}

export interface BiometricDeleteTarget {
  diningRoomId: number
  diningRoomName: string
  success: boolean
  error?: string
}

export interface BiometricDeleteResult {
  dinerId: number
  cedula: string
  targets: BiometricDeleteTarget[]
  diskCleared: boolean
  dbCleared: boolean
  totalSuccess: boolean
}

// ── STORE ─────────────────────────────────────────────────────────────────────

export const useBiometricsStore = defineStore('biometrics', () => {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const terminalStatuses = ref<TerminalHealthStatus[]>([])
  const isLoadingHealth = ref(false)
  const isSyncing = ref(false)
  const isClearing = ref(false)
  const lastSyncResult = ref<BiometricSyncResult | null>(null)
  const lastDeleteResult = ref<BiometricDeleteResult | null>(null)

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Consulta el estado de conectividad en tiempo real de todos los terminales
   * Hikvision activos registrados en la base de datos.
   * Actualiza el estado local sin refetch posterior.
   */
  async function fetchTerminalHealth(): Promise<TerminalHealthStatus[]> {
    isLoadingHealth.value = true
    try {
      const data = await $fetch<TerminalHealthStatus[]>('/api/biometrics/health')
      terminalStatuses.value = data
      return data
    } finally {
      isLoadingHealth.value = false
    }
  }

  /**
   * Dispara la orquestación de sincronización multi-sede para un comensal.
   * Extrae la foto del terminal de origen y la replica a todos los terminales activos.
   * Lanza el error al composable (no lo captura aquí) para que la UI pueda reaccionar.
   */
  async function syncDinerAcrossAllTerminals(dinerId: number): Promise<BiometricSyncResult> {
    isSyncing.value = true
    lastSyncResult.value = null
    try {
      const result = await $fetch<BiometricSyncResult>(`/api/biometrics/sync/${dinerId}`, {
        method: 'POST'
      })
      lastSyncResult.value = result
      return result
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Purga y resetea las credenciales biométricas de un comensal en todos los terminales,
   * disco local y base de datos.
   */
  async function clearDinerBiometrics(dinerId: number): Promise<BiometricDeleteResult> {
    isClearing.value = true
    lastDeleteResult.value = null
    try {
      const result = await $fetch<BiometricDeleteResult>(`/api/biometrics/sync/${dinerId}`, {
        method: 'DELETE'
      })
      lastDeleteResult.value = result
      return result
    } finally {
      isClearing.value = false
    }
  }

  /**
   * Limpia el resultado de la última sincronización o borrado.
   * Llamado por el composable al limpiar la búsqueda activa.
   */
  function clearLastSyncResult() {
    lastSyncResult.value = null
    lastDeleteResult.value = null
  }

  // ── Retorno público (estado de solo lectura) ─────────────────────────────────
  return {
    // Estado
    terminalStatuses: readonly(terminalStatuses),
    isLoadingHealth: readonly(isLoadingHealth),
    isSyncing: readonly(isSyncing),
    isClearing: readonly(isClearing),
    lastSyncResult: readonly(lastSyncResult),
    lastDeleteResult: readonly(lastDeleteResult),

    // Acciones
    fetchTerminalHealth,
    syncDinerAcrossAllTerminals,
    clearDinerBiometrics,
    clearLastSyncResult,
  }
})

