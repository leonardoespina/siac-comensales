import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'
import { useAudioAlerts } from '~/composables/core/useAudioAlerts'

/* =========================================================================
 * [LEGACY / BIOMÉTRICO ANTERIOR - DigitalPersona U.are.U 5160 USB]
 * Se mantiene comentado para referencia o respaldo operativo.
 * =========================================================================
 * import { useBiometrics } from '~/composables/features/useBiometrics'
 * ========================================================================= */

export function useDispatchManagement() {
  const $q = useQuasar()
  const dinersStore = useDinersStore()
  const { playAlert } = useAudioAlerts()
  const nuxtApp = useNuxtApp()
  const socket = (nuxtApp as any)?.$socket

  /* =========================================================================
   * [LEGACY / BIOMÉTRICO ANTERIOR - Desestructuración de useBiometrics]
   * const {
   *   isReaderConnected,
   *   isVerifying,
   *   startMonitoring,
   *   stopMonitoring,
   *   verifyFingerprint,
   *   cancelOperation,
   *   capturedImage
   * } = useBiometrics()
   * ========================================================================= */

  // ── ESTADO DEL LECTOR FACIAL HIKVISION (ACTUAL) ──────────────────────────────
  const isReaderConnected = ref(true) // Conectado por red / Socket.io
  const isVerifying = ref(false)
  const capturedImage = ref<string | null>(null)
  const lastBiometricScan = ref<any>(null)

  const searchCedula = ref('')
  const isSearching = ref(false)
  
  // Variables de Estado para el Overlay Efímero (Modo Kiosco)
  const overlayStatus = ref<'idle' | 'success' | 'error'>('idle')
  const overlayMessage = ref('')
  const overlayTitle = ref('')
  const lastDispatchResult = ref<any>(null)
  
  // Modal de Configuración (Ubicación)
  const isDiningRoomModalOpen = ref(false)
  const diningRooms = ref<any[]>([])
  const selectedDiningRoomId = ref<number | null>(null)

  /* =========================================================================
   * [LEGACY / BIOMÉTRICO ANTERIOR - Cache local de huellas FMD Base64]
   * const candidateTemplates = ref<string[]>([])
   * const mappingArray = ref<any[]>([])
   * const isKioskActive = ref(false)
   *
   * async function preloadBiometrics() {
   *   try {
   *     const data = await dinersStore.fetchAllBiometrics()
   *     const flatTemplates: string[] = []
   *     const flatMapping: any[] = []
   *     data.forEach(record => {
   *       if (record.templates && Array.isArray(record.templates)) {
   *         record.templates.forEach((t: string) => {
   *           flatTemplates.push(t)
   *           flatMapping.push(record.diner)
   *         })
   *       }
   *     })
   *     candidateTemplates.value = flatTemplates
   *     mappingArray.value = flatMapping
   *   } catch (error) {
   *     $q.notify({ type: 'negative', message: 'Error descargando huellas para el kiosco' })
   *   }
   * }
   * ========================================================================= */

  // ── MODO EDGE LOCAL (0 MS) Y BYPASS AUTOMÁTICO ─────────────────────────────
  const isEdgeModePreferred = ref(false)
  const isEdgeConnected = ref(false)
  const isEdgeFallbackActive = ref(false)
  let edgeWs: WebSocket | null = null
  let edgeReconnectTimer: any = null

  function connectToEdgeAgent() {
    if (typeof window === 'undefined') return
    if (edgeWs) {
      try { edgeWs.close() } catch {}
      edgeWs = null
    }

    try {
      edgeWs = new WebSocket('ws://localhost:3005')

      edgeWs.onopen = () => {
        isEdgeConnected.value = true
        isEdgeFallbackActive.value = false
        console.log('🟢 [useDispatchManagement] Conectado a Kiosk Edge Agent (0 ms).')
        $q.notify({
          type: 'positive',
          message: '🟢 Modo Edge Local Activo (Latencia: 0 ms)',
          timeout: 2500,
          position: 'top-right'
        })
        // En modo Edge desactivamos el listener central para evitar despachos dobles
        if (socket) {
          socket.off('biometric:identified')
        }
      }

      edgeWs.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(msgEvent.data)
          if (data.type === 'dispatch:result') {
            if (data.success && data.diner) {
              lastDispatchResult.value = {
                diner: data.diner,
                dispatch: { shift: data.diner.shift }
              }
              overlayStatus.value = 'success'
              overlayTitle.value = '¡Buen Provecho!'
              overlayMessage.value = `${data.diner.name} tiene autorizado su ${data.diner.shift}.`
              playAlert('SUCCESS')
            } else {
              const isAlreadyDispatched = data.code === 'ALREADY_DISPATCHED'
              overlayStatus.value = 'error'
              overlayTitle.value = isAlreadyDispatched ? 'Alerta de Duplicidad' : 'Acceso Denegado'
              overlayMessage.value = data.message || 'No se pudo procesar el despacho.'
              playAlert(data.code || 'GENERIC_ERROR')
            }

            setTimeout(() => {
              overlayStatus.value = 'idle'
            }, 3500)
          } else if (data.type === 'edge:sheet_updated') {
            console.log(`📋 [useDispatchManagement] Padrón de Edge actualizado: ${data.totalApproved} autorizados.`)
            $q.notify({
              type: 'info',
              message: `📋 Padrón local actualizado (${data.totalApproved} comensales)`,
              timeout: 2500,
              position: 'bottom-right'
            })
          }
        } catch (e: any) {
          console.error('❌ Error procesando mensaje de Edge Agent:', e.message)
        }
      }

      edgeWs.onclose = () => {
        const wasConnected = isEdgeConnected.value
        isEdgeConnected.value = false
        edgeWs = null

        if (isEdgeModePreferred.value) {
          isEdgeFallbackActive.value = true
          console.warn('⚠️ [useDispatchManagement] Agente local desconectado. Activando BYPASS a Servidor Central...')
          if (wasConnected) {
            $q.notify({
              type: 'warning',
              message: '⚠️ Agente local desconectado. Activando BYPASS a Servidor Central.',
              timeout: 3000,
              position: 'top-right'
            })
          }
          // BYPASS AUTOMÁTICO INMEDIATO:
          setupHikvisionSocket()

          // Reintentar reconexión al agente local cada 6 segundos
          if (edgeReconnectTimer) clearTimeout(edgeReconnectTimer)
          edgeReconnectTimer = setTimeout(() => {
            if (isEdgeModePreferred.value && !isEdgeConnected.value) {
              connectToEdgeAgent()
            }
          }, 6000)
        }
      }

      edgeWs.onerror = () => {
        // El fallo gatilla el onclose que activa el Bypass
      }
    } catch {
      isEdgeConnected.value = false
      if (isEdgeModePreferred.value) {
        isEdgeFallbackActive.value = true
        setupHikvisionSocket()
      }
    }
  }

  function toggleEdgeMode(enabled: boolean) {
    isEdgeModePreferred.value = enabled
    localStorage.setItem('dispatch_edge_mode', enabled ? 'true' : 'false')

    if (enabled) {
      connectToEdgeAgent()
    } else {
      isEdgeFallbackActive.value = false
      isEdgeConnected.value = false
      if (edgeWs) {
        try { edgeWs.close() } catch {}
        edgeWs = null
      }
      if (edgeReconnectTimer) {
        clearTimeout(edgeReconnectTimer)
        edgeReconnectTimer = null
      }
      setupHikvisionSocket()
      // Enlace transparente: asegurar que el servidor central tenga el stream vivo y fresco
      if (selectedDiningRoomId.value) {
        $fetch(`/api/biometrics/streams/${selectedDiningRoomId.value}/restart`, { method: 'POST' }).catch(() => {})
      }
      $q.notify({
        type: 'info',
        message: '🟡 Modo Servidor Central Activo (Normal)',
        timeout: 2000,
        position: 'top-right'
      })
    }
  }

  // ── CONEXIÓN EN TIEMPO REAL HIKVISION (SOCKET.IO CENTRAL) ───────────────────

  function setupHikvisionSocket() {
    if (!socket) return

    const joinRoom = () => {
      if (selectedDiningRoomId.value) {
        socket.emit('join:dining_room', { diningRoomId: selectedDiningRoomId.value })
      }
    }

    joinRoom()
    socket.off('connect', joinRoom)
    socket.on('connect', joinRoom)

    // Escuchar detecciones faciales y biométricas en tiempo real
    socket.off('biometric:identified')
    socket.on('biometric:identified', async (event: any) => {
      console.log('🔔 [useDispatchManagement] Rostro identificado en tiempo real (Central):', event)

      // Evitar llamadas concurrentes si ya se está despachando
      if (isSearching.value) return

      // Si el evento pertenece a este comedor o estamos en modo global
      if (!selectedDiningRoomId.value || event.diningRoomId === selectedDiningRoomId.value) {
        lastBiometricScan.value = event
        isVerifying.value = true
        await dispatchFood(event.cedula)
        isVerifying.value = false
      }
    })
  }

  onMounted(async () => {
    // 1. Cargar comedor guardado
    const savedId = localStorage.getItem('dispatch_dining_room_id')
    if (savedId) {
      selectedDiningRoomId.value = parseInt(savedId, 10)
    }

    // 2. Cargar preferencia de Modo Edge (Default: false -> Central)
    isEdgeModePreferred.value = localStorage.getItem('dispatch_edge_mode') === 'true'

    try {
      const allRooms = await $fetch<any[]>('/api/dining-rooms')
      diningRooms.value = allRooms.filter(dr => dr.active)

      // Regla de Negocio: Si tiene 1 solo comedor autorizado, fijarlo automáticamente
      if (diningRooms.value.length === 1) {
        const singleId = diningRooms.value[0].id
        selectedDiningRoomId.value = singleId
        localStorage.setItem('dispatch_dining_room_id', singleId.toString())
        isDiningRoomModalOpen.value = false
      } else {
        const isValid = diningRooms.value.some(dr => dr.id === selectedDiningRoomId.value)
        if (!savedId || !isValid) {
          selectedDiningRoomId.value = null
          isDiningRoomModalOpen.value = true
        }
      }

      // Conexión reactiva según preferencia
      if (isEdgeModePreferred.value) {
        connectToEdgeAgent()
      } else {
        setupHikvisionSocket()
      }
    } catch (error: any) {
      $q.notify({ type: 'negative', message: 'Error al cargar comedores: ' + (error.data?.message || error.message) })
    }
  })

  onUnmounted(() => {
    if (socket) {
      socket.off('biometric:identified')
    }
    if (edgeWs) {
      try { edgeWs.close() } catch {}
      edgeWs = null
    }
    if (edgeReconnectTimer) {
      clearTimeout(edgeReconnectTimer)
      edgeReconnectTimer = null
    }
  })

  async function saveDiningRoomSelection(id: number) {
    if (!id) return
    selectedDiningRoomId.value = id
    localStorage.setItem('dispatch_dining_room_id', id.toString())
    isDiningRoomModalOpen.value = false
    
    // Conectar el socket al nuevo comedor seleccionado
    setupHikvisionSocket()
  }

  /* =========================================================================
   * [LEGACY / BIOMÉTRICO ANTERIOR - Bucle de polling local del sensor USB]
   * function startKioskLoop() {
   *   isKioskActive.value = true
   *   startMonitoring()
   *   runScannerCycle()
   * }
   * function stopKioskLoop() {
   *   isKioskActive.value = false
   *   stopMonitoring()
   *   cancelOperation()
   * }
   * async function runScannerCycle() {
   *   if (!isKioskActive.value || !isReaderConnected.value || isVerifying.value) return
   *   const matchedIndex = await verifyFingerprint(candidateTemplates.value)
   *   if (matchedIndex === null || matchedIndex < 0) {
   *     if (isKioskActive.value) {
   *       if (capturedImage.value) {
   *         playAlert('FINGERPRINT_NO_MATCH')
   *         overlayStatus.value = 'error'
   *         overlayTitle.value = 'Huella no reconocida'
   *         overlayMessage.value = 'No se pudo identificar su huella. Por favor, intente de nuevo.'
   *         setTimeout(() => { overlayStatus.value = 'idle'; runScannerCycle() }, 2500)
   *       } else {
   *         setTimeout(runScannerCycle, 1500)
   *       }
   *     }
   *     return
   *   }
   *   const matchedDiner = mappingArray.value[matchedIndex]
   *   await dispatchFood(matchedDiner.cedula)
   * }
   * ========================================================================= */

  function stopKioskLoop() {
    if (socket) {
      socket.off('biometric:identified')
    }
  }

  // Despacho vía manual (Fallback)
  async function processManualDispatch() {
    if (!searchCedula.value) return
    await dispatchFood(searchCedula.value)
    searchCedula.value = ''
  }

  function clearSearch() {
    searchCedula.value = ''
    overlayStatus.value = 'idle'
  }

  async function dispatchFood(cedula: string) {
    if (!cedula) return
    if (!selectedDiningRoomId.value) {
      isDiningRoomModalOpen.value = true
      return
    }

    isSearching.value = true
    
    try {
      // Llamada al store de Pinia
      const response = await dinersStore.processDispatch(cedula, selectedDiningRoomId.value)
      
      lastDispatchResult.value = response
      overlayStatus.value = 'success'
      overlayTitle.value = '¡Buen Provecho!'
      overlayMessage.value = `${response.diner.name} tiene autorizado su ${response.dispatch.shift}.`
      
      playAlert('SUCCESS')
    } catch (error: any) {
      const isAlreadyDispatched = error.response?.status === 409 || error.data?.data?.code === 'ALREADY_DISPATCHED'
      const isWrongRoom = error.data?.data?.code === 'WRONG_DINING_ROOM' || error.data?.code === 'WRONG_DINING_ROOM'
      const isMassive = error.data?.data?.code === 'MASSIVE_REQUEST' || error.data?.code === 'MASSIVE_REQUEST'
      const isNoActiveShiftReq = error.data?.data?.code === 'NO_REQUEST_FOR_ACTIVE_SHIFT' || error.data?.code === 'NO_REQUEST_FOR_ACTIVE_SHIFT'
      
      overlayStatus.value = 'error'
      overlayTitle.value = isAlreadyDispatched 
        ? 'Alerta de Duplicidad' 
        : (isMassive 
            ? 'Retiro Masivo Asignado' 
            : (isNoActiveShiftReq 
                ? 'Sin Solicitud para este Turno' 
                : (isWrongRoom ? 'Comedor No Asignado' : 'Acceso Denegado')))
      overlayMessage.value = error.data?.message || 'No se pudo procesar el despacho.'
      
      const errorCode = error.data?.data?.code || error.data?.code || 'GENERIC_ERROR'
      playAlert(errorCode)
    } finally {
      isSearching.value = false
      
      // Mostrar el mensaje gigante por 3.5 segundos y volver a escuchar
      setTimeout(() => {
        overlayStatus.value = 'idle'
      }, 3500)
    }
  }

  async function refreshEdgeSheet() {
    if (!isEdgeConnected.value) return
    try {
      const res = await fetch('http://localhost:3005/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        $q.notify({
          type: 'positive',
          message: '📋 Padrón sincronizado con Servidor Central',
          timeout: 2000,
          position: 'top-right'
        })
      }
    } catch {
      $q.notify({
        type: 'negative',
        message: 'No se pudo contactar al agente local',
        timeout: 2500,
        position: 'top-right'
      })
    }
  }

  return {
    searchCedula,
    isSearching: readonly(isSearching),
    overlayStatus: readonly(overlayStatus),
    overlayMessage: readonly(overlayMessage),
    overlayTitle: readonly(overlayTitle),
    lastDispatchResult: readonly(lastDispatchResult),
    isDiningRoomModalOpen,
    diningRooms: readonly(diningRooms),
    selectedDiningRoomId,
    isReaderConnected: readonly(isReaderConnected),
    isVerifying: readonly(isVerifying),
    lastBiometricScan: readonly(lastBiometricScan),
    saveDiningRoomSelection,
    processManualDispatch,
    clearSearch,
    stopKioskLoop,
    capturedImage: readonly(capturedImage),
    isEdgeModePreferred: readonly(isEdgeModePreferred),
    isEdgeConnected: readonly(isEdgeConnected),
    isEdgeFallbackActive: readonly(isEdgeFallbackActive),
    toggleEdgeMode,
    refreshEdgeSheet
  }
}
