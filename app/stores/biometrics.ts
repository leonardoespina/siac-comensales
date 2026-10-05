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

export interface StreamSnapshot {
  diningRoomId: number
  diningRoomName: string
  status: 'CONNECTING' | 'CONNECTED' | 'BACKOFF' | 'DOWN' | 'STOPPED'
  displayStatus: 'CONNECTED' | 'CONNECTING' | 'DOWN'
  attempt: number
  lastDataAt: string | null
  lastError: string | null
  nextRetryAt: string | null
  canManualRestart: boolean
  cooldownRemainingSec: number
}

// ── STORE ─────────────────────────────────────────────────────────────────────

export const useBiometricsStore = defineStore('biometrics', () => {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const terminalStatuses = ref<TerminalHealthStatus[]>([])
  const streamStatuses = ref<Record<number, StreamSnapshot>>({})
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
   * Obtiene un frame JPEG en vivo (dataUrl base64) de la cámara del terminal.
   */
  async function fetchSnapshot(diningRoomId: number): Promise<{ dataUrl: string; fileSizeKB: number; timestamp: Date }> {
    return await $fetch<{ dataUrl: string; fileSizeKB: number; timestamp: Date }>('/api/biometrics/snapshot', {
      query: { diningRoomId }
    })
  }

  /**
   * Captura la foto en vivo del terminal y la enrola como rostro oficial del comensal.
   */
  async function remoteCaptureFace(diningRoomId: number, cedula: string): Promise<any> {
    return await $fetch('/api/biometrics/remote-capture', {
      method: 'POST',
      body: { diningRoomId, cedula }
    })
  }

  /**
   * Dispara el modo de captura interactivo en la pantalla táctil física del terminal MinMoe.
   */
  async function triggerInteractiveCapture(diningRoomId: number, cedula: string): Promise<any> {
    return await $fetch('/api/biometrics/interactive-capture', {
      method: 'POST',
      body: { diningRoomId, cedula }
    })
  }

  /**
   * Consulta el estado actual de los streams biométricos.
   */
  async function fetchStreamStatus(diningRoomId?: number): Promise<StreamSnapshot[]> {
    const query = diningRoomId ? { diningRoomId } : undefined
    const snapshots = await $fetch<StreamSnapshot[]>('/api/biometrics/streams', { query })
    for (const snap of snapshots) {
      streamStatuses.value[snap.diningRoomId] = snap
    }
    return snapshots
  }

  /**
   * Solicita la reconexión manual de un stream de comedor.
   */
  async function restartStream(diningRoomId: number): Promise<StreamSnapshot> {
    const result = await $fetch<StreamSnapshot>(`/api/biometrics/streams/${diningRoomId}/restart`, {
      method: 'POST'
    })
    streamStatuses.value[diningRoomId] = result
    return result
  }

  function setStreamStatus(snapshot: StreamSnapshot) {
    streamStatuses.value[snapshot.diningRoomId] = snapshot
  }

  /**
   * Limpia el resultado de la última sincronización o borrado.
   */
  function clearLastSyncResult() {
    lastSyncResult.value = null
    lastDeleteResult.value = null
  }

  // ── Retorno público (estado de solo lectura) ─────────────────────────────────
  return {
    // Estado
    terminalStatuses: readonly(terminalStatuses),
    streamStatuses: readonly(streamStatuses),
    isLoadingHealth: readonly(isLoadingHealth),
    isSyncing: readonly(isSyncing),
    isClearing: readonly(isClearing),
    lastSyncResult: readonly(lastSyncResult),
    lastDeleteResult: readonly(lastDeleteResult),

    // Acciones
    fetchTerminalHealth,
    fetchStreamStatus,
    restartStream,
    setStreamStatus,
    syncDinerAcrossAllTerminals,
    clearDinerBiometrics,
    clearLastSyncResult,
    fetchSnapshot,
    remoteCaptureFace,
    triggerInteractiveCapture
  }
}
)

