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

  // ── CONEXIÓN EN TIEMPO REAL HIKVISION (SOCKET.IO) ────────────────────────────

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
      console.log('🔔 [useDispatchManagement] Rostro identificado en tiempo real:', event)

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
    const savedId = localStorage.getItem('dispatch_dining_room_id')
    if (savedId) {
      selectedDiningRoomId.value = parseInt(savedId, 10)
    }

    try {
      const allRooms = await $fetch<any[]>('/api/dining-rooms')
      diningRooms.value = allRooms.filter(dr => dr.active)

      // Regla de Negocio: Si tiene 1 solo comedor autorizado, fijarlo automáticamente
      if (diningRooms.value.length === 1) {
        const singleId = diningRooms.value[0].id
        selectedDiningRoomId.value = singleId
        localStorage.setItem('dispatch_dining_room_id', singleId.toString())
        isDiningRoomModalOpen.value = false
        setupHikvisionSocket()
      } else {
        const isValid = diningRooms.value.some(dr => dr.id === selectedDiningRoomId.value)
        if (!savedId || !isValid) {
          selectedDiningRoomId.value = null
          isDiningRoomModalOpen.value = true
        } else {
          setupHikvisionSocket()
        }
      }
    } catch (error: any) {
      $q.notify({ type: 'negative', message: 'Error al cargar comedores: ' + (error.data?.message || error.message) })
    }
  })

  onUnmounted(() => {
    if (socket) {
      socket.off('biometric:identified')
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
    capturedImage: readonly(capturedImage)
  }
}
