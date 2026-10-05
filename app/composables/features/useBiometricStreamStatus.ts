import { ref, computed, watch, readonly, onMounted, onUnmounted, type Ref } from 'vue'
import { useQuasar } from 'quasar'
import { useBiometricsStore } from '~/stores/biometrics'

export function useBiometricStreamStatus(diningRoomId: Ref<number | null>) {
  const $q = useQuasar()
  const biometricsStore = useBiometricsStore()
  const nuxtApp = useNuxtApp()
  const socket = (nuxtApp as any)?.$socket

  const isRestarting = ref(false)
  const cooldownSec = ref(0)
  let cooldownTimer: NodeJS.Timeout | null = null

  const currentSnapshot = computed(() => {
    if (!diningRoomId.value) return null
    return biometricsStore.streamStatuses[diningRoomId.value] || null
  })

  const displayStatus = computed<'CONNECTED' | 'CONNECTING' | 'DOWN'>(() => {
    return currentSnapshot.value?.displayStatus || 'CONNECTING'
  })

  const isOnline = computed(() => displayStatus.value === 'CONNECTED')
  const isRecovering = computed(() => displayStatus.value === 'CONNECTING')
  const isDown = computed(() => displayStatus.value === 'DOWN')

  const canRestart = computed(() => {
    if (!diningRoomId.value || isRestarting.value || cooldownSec.value > 0) return false
    return currentSnapshot.value?.canManualRestart || isDown.value
  })

  function startCooldownCountdown(seconds: number) {
    cooldownSec.value = seconds
    if (cooldownTimer) clearInterval(cooldownTimer)
    cooldownTimer = setInterval(() => {
      cooldownSec.value--
      if (cooldownSec.value <= 0) {
        cooldownSec.value = 0
        if (cooldownTimer) clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }, 1000)
  }

  async function loadStatus() {
    if (!diningRoomId.value) return
    try {
      await biometricsStore.fetchStreamStatus(diningRoomId.value)
    } catch {
      // Ignorar silencio en carga inicial
    }
  }

  async function restart() {
    if (!diningRoomId.value || !canRestart.value) return
    isRestarting.value = true
    try {
      const result = await biometricsStore.restartStream(diningRoomId.value)
      $q.notify({
        type: 'positive',
        message: `Reconexión solicitada para ${result.diningRoomName}`,
        icon: 'sync'
      })
      startCooldownCountdown(30)
    } catch (error: any) {
      const isRateLimited = error.response?.status === 429 || error.data?.data?.code === 'RATE_LIMITED'
      if (isRateLimited) {
        const msg = error.data?.message || 'Reconexión en enfriamiento. Espere 30s.'
        $q.notify({ type: 'warning', message: msg })
        startCooldownCountdown(30)
      } else {
        $q.notify({
          type: 'negative',
          message: error.data?.message || error.message || 'Error solicitando reconexión'
        })
      }
    } finally {
      isRestarting.value = false
    }
  }

  function handleStatusEvent(snapshot: any) {
    if (snapshot && snapshot.diningRoomId) {
      biometricsStore.setStreamStatus(snapshot)
    }
  }

  onMounted(() => {
    loadStatus()
    if (socket) {
      socket.off('biometric:stream_status_changed', handleStatusEvent)
      socket.on('biometric:stream_status_changed', handleStatusEvent)
    }
  })

  onUnmounted(() => {
    if (socket) {
      socket.off('biometric:stream_status_changed', handleStatusEvent)
    }
    if (cooldownTimer) clearInterval(cooldownTimer)
  })

  watch(diningRoomId, (newId) => {
    if (newId) loadStatus()
  })

  return {
    displayStatus: readonly(displayStatus),
    isOnline: readonly(isOnline),
    isRecovering: readonly(isRecovering),
    isDown: readonly(isDown),
    canRestart: readonly(canRestart),
    cooldownSec: readonly(cooldownSec),
    isRestarting: readonly(isRestarting),
    currentSnapshot,
    restart
  }
}
