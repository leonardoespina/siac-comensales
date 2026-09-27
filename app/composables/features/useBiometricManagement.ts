import { ref, readonly, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import { useDinersStore } from '~/stores/diners'
import { useNotifications } from '~/composables/core/useNotifications'
import { useBiometricsStore } from '~/stores/biometrics'
import type { TerminalHealthStatus, BiometricSyncTarget, BiometricSyncResult } from '~/stores/biometrics'

// ── TIPOS (re-exportados desde el store para retrocompatibilidad) ──────────────
export type { TerminalHealthStatus, BiometricSyncTarget, BiometricSyncResult }

// ── COMPOSABLE ────────────────────────────────────────────────────────────────

export function useBiometricManagement() {
  const $q = useQuasar()
  const { notify } = useNotifications()
  const store = useDinersStore()
  const biometricsStore = useBiometricsStore()

  // ── Refs reactivos del store (storeToRefs preserva la reactividad) ───────────────
  const { terminalStatuses, isLoadingHealth, isSyncing, isClearing, lastSyncResult } = storeToRefs(biometricsStore)

  // ── Estado de búsqueda ────────────────────────────────────────────────────
  const searchCedula = ref('')
  const isSearching = ref(false)
  const searchAttempted = ref(false)
  const diner = ref<any>(null)

  // ── Estado de modales ─────────────────────────────────────────────────────
  const isBiometricModalOpen = ref(false)
  const isGeneralIdentificationModalOpen = ref(false)
  /** @deprecated Mantenido como variable interna por compatibilidad de template */
  const isVerificationModalOpen = ref(false)

  // ── Estado de foto facial ─────────────────────────────────────────────────
  const facePhotoKey = ref(Date.now())
  const facePhotoUrl = computed(() => {
    if (!diner.value?.cedula) return null
    // Añade timestamp para invalidar caché tras sincronización o borrado
    return `/api/biometrics/face/${diner.value.cedula}?t=${facePhotoKey.value}`
  })
  const facePhotoError = ref(false)

  // ── Estado de sincronización y salud — delegados al store de Pinia ─────────
  // (El store es la única fuente de verdad para estos datos)

  // ── Auto-polling de salud de terminales ───────────────────────────────
  const HEALTH_POLL_MS = 30_000
  const healthPollTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const isAutoPollingHealth = ref(false)

  function startHealthPolling() {
    if (healthPollTimer.value) return // Ya está corriendo
    isAutoPollingHealth.value = true
    // Fetch inmediato al montar el componente
    biometricsStore.fetchTerminalHealth().catch(() => {})
    // Luego cada 30 segundos
    healthPollTimer.value = setInterval(() => {
      biometricsStore.fetchTerminalHealth().catch(() => {})
    }, HEALTH_POLL_MS)
  }

  function stopHealthPolling() {
    if (healthPollTimer.value) {
      clearInterval(healthPollTimer.value)
      healthPollTimer.value = null
    }
    isAutoPollingHealth.value = false
  }

  onMounted(() => startHealthPolling())
  onUnmounted(() => stopHealthPolling())

  // ── Acciones de búsqueda ──────────────────────────────────────────────────

  async function searchDiner() {
    if (!searchCedula.value) return

    isSearching.value = true
    searchAttempted.value = true
    diner.value = null
    facePhotoError.value = false

    const queryCedula = searchCedula.value.trim().toUpperCase()

    try {
      diner.value = await store.fetchByCedula(queryCedula)
    } catch (error: any) {
      if (error.response?.status !== 404) {
        let msg = error.data?.message || error.message || 'Error al buscar comensal'
        if (msg.includes('DP_FAILURE')) {
          msg = 'Lectura fallida. Limpie el sensor de huella e intente nuevamente.'
        } else if (msg.includes('Validation')) {
          msg = 'Formato de cédula inválido.'
        }
        notify.error(msg)
      }
    } finally {
      isSearching.value = false
    }
  }

  function clearSearch() {
    searchCedula.value = ''
    diner.value = null
    searchAttempted.value = false
    facePhotoError.value = false
    biometricsStore.clearLastSyncResult()
  }

  // ── Acciones de modales ───────────────────────────────────────────────────

  function openBiometricModal() {
    isBiometricModalOpen.value = true
  }

  function openGeneralIdentificationModal() {
    isGeneralIdentificationModalOpen.value = true
  }

  function onGeneralIdentification(matchedDiner: any) {
    searchCedula.value = matchedDiner.cedula
    searchDiner()
  }

  function onFingerprintSaved() {
    // Refresca los datos para mostrar que ya tiene huella
    searchDiner()
  }

  // ── Acción: Desvincular Huella ────────────────────────────────────────────

  function confirmDeleteFingerprint() {
    if (!diner.value) return

    $q.dialog({
      title: 'Desvincular Huella',
      message: `¿Estás seguro que deseas borrar la huella de ${diner.value.name}? Tendrá que enrolarse nuevamente para el despacho.`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.clearFingerprint(diner.value.id)
        notify.success('Huella borrada exitosamente')
        searchDiner()
      } catch (error: any) {
        notify.error(error.data?.message || 'Error al borrar huella')
      }
    })
  }

  // ── Acción: Sincronizar en Todas las Sedes ────────────────────────────────

  async function syncAcrossAllTerminals() {
    if (!diner.value?.id) return

    $q.dialog({
      title: 'Replicar en Todas las Sedes',
      message: `Se sincronizará el rostro y huella de <strong>${diner.value.name}</strong> a todos los terminales activos del sistema. ¿Confirmar?`,
      html: true,
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Sincronizar', color: 'primary' },
      persistent: true
    }).onOk(async () => {
      try {
        const result = await biometricsStore.syncDinerAcrossAllTerminals(diner.value.id)

        if (result.totalSuccess) {
          const detail = result.fpSynced ? 'Rostro y huella sincronizados' : 'Rostro sincronizado'
          notify.success(`✅ ${detail} en ${result.targets.length} sede(s) exitosamente.`)
        } else {
          const failed = result.targets.filter(t => !t.userSuccess).map(t => t.diningRoomName).join(', ')
          notify.warning(`Sincronización parcial. Fallaron: ${failed}`)
        }

        facePhotoKey.value = Date.now()
        await searchDiner()
      } catch (error: any) {
        notify.error(error.data?.message || 'Error al sincronizar con los terminales')
      }
    })
  }

  // ── Acción: Limpiar y Resetear Datos Biométricos Multi-Sede ───────────────

  async function confirmClearBiometrics() {
    if (!diner.value?.id) return

    $q.dialog({
      title: 'Limpiar Datos Biométricos',
      message: `Se eliminará el rostro y credenciales de <strong>${diner.value.name}</strong> (${diner.value.cedula}) de todos los terminales Hikvision, disco y base de datos.<br><br><span class="text-caption text-negative">Nota: El histórico de comidas y consumos pasados NO se verá afectado.</span>`,
      html: true,
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Limpiar y Re-enrolar', color: 'negative' },
      persistent: true
    }).onOk(async () => {
      try {
        const result = await biometricsStore.clearDinerBiometrics(diner.value.id)
        if (result.totalSuccess) {
          notify.success(`✅ Datos biométricos limpiados en ${result.targets.length} sede(s). Listo para nuevo registro.`)
        } else {
          notify.warning('Limpieza parcial en terminales. Revisa la conectividad de los equipos.')
        }
        facePhotoKey.value = Date.now()
        await searchDiner()
      } catch (error: any) {
        notify.error(error.data?.message || 'Error al limpiar datos biométricos')
      }
    })
  }

  // ── Acción: Cargar salud de terminales ────────────────────────────────────

  async function refreshTerminalHealth() {
    try {
      await biometricsStore.fetchTerminalHealth()
    } catch {
      notify.error('No se pudo obtener el estado de los terminales')
    }
  }

  function onFacePhotoError() {
    facePhotoError.value = true
  }

  // ── Retorno público (estado de solo lectura) ──────────────────────────────

  return {
    // Búsqueda
    searchCedula,
    isSearching: readonly(isSearching),
    searchAttempted: readonly(searchAttempted),
    diner: readonly(diner),
    searchDiner,
    clearSearch,

    // Modales
    isBiometricModalOpen,
    isVerificationModalOpen,
    isGeneralIdentificationModalOpen,
    openBiometricModal,
    openGeneralIdentificationModal,
    onGeneralIdentification,
    onFingerprintSaved,
    confirmDeleteFingerprint,

    // Foto facial
    facePhotoUrl,
    facePhotoError: readonly(facePhotoError),
    onFacePhotoError,

    // Sync multi-sede (ref reactivo desde storeToRefs)
    isSyncing,
    isClearing,
    lastSyncResult,
    syncAcrossAllTerminals,
    confirmClearBiometrics,

    // Salud de terminales (refs reactivos desde storeToRefs)
    terminalStatuses,
    isLoadingHealth,
    refreshTerminalHealth,
    // Auto-polling
    isAutoPollingHealth: readonly(isAutoPollingHealth),
  }
}

