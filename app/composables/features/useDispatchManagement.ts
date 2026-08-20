import { ref, readonly, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'
import { useBiometrics } from '~/composables/features/useBiometrics'
import { useAudioAlerts } from '~/composables/core/useAudioAlerts'

export function useDispatchManagement() {
  const $q = useQuasar()
  const dinersStore = useDinersStore()
  
  const {
    isReaderConnected,
    isVerifying,
    startMonitoring,
    stopMonitoring,
    verifyFingerprint,
    cancelOperation,
    capturedImage
  } = useBiometrics()

  const { playAlert } = useAudioAlerts()

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
  
  // Base de datos local biométrica
  const candidateTemplates = ref<string[]>([])
  const mappingArray = ref<any[]>([])
  const isKioskActive = ref(false)

  onMounted(async () => {
    const savedId = localStorage.getItem('dispatch_dining_room_id')
    if (savedId) {
      selectedDiningRoomId.value = parseInt(savedId, 10)
    }

    try {
      const allRooms = await $fetch<any[]>('/api/dining-rooms')
      // Filtramos para asegurar que incluso los súper usuarios solo vean los comedores activos en los selectores operativos
      diningRooms.value = allRooms.filter(dr => dr.active)
      const isValid = diningRooms.value.some(dr => dr.id === selectedDiningRoomId.value)
      if (!savedId || !isValid) {
        selectedDiningRoomId.value = null
        isDiningRoomModalOpen.value = true
      } else {
        // Si ya está configurado, precargar las huellas y encender el Kiosco
        await preloadBiometrics()
        startKioskLoop()
      }
    } catch (error: any) {
      $q.notify({ type: 'negative', message: 'Error al cargar comedores: ' + (error.data?.message || error.message) })
    }
  })

  async function saveDiningRoomSelection(id: number) {
    if (!id) return
    selectedDiningRoomId.value = id
    localStorage.setItem('dispatch_dining_room_id', id.toString())
    isDiningRoomModalOpen.value = false
    
    // Iniciar el lector tras configurar la ubicación
    await preloadBiometrics()
    startKioskLoop()
  }

  async function preloadBiometrics() {
    try {
      const data = await dinersStore.fetchAllBiometrics()
      const flatTemplates: string[] = []
      const flatMapping: any[] = []
      
      data.forEach(record => {
        if (record.templates && Array.isArray(record.templates)) {
          record.templates.forEach((t: string) => {
            flatTemplates.push(t)
            flatMapping.push(record.diner)
          })
        }
      })
      candidateTemplates.value = flatTemplates
      mappingArray.value = flatMapping
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error descargando huellas para el kiosco' })
    }
  }

  // --- Lógica del Bucle Kiosco ---
  function startKioskLoop() {
    isKioskActive.value = true
    startMonitoring()
    runScannerCycle()
  }

  function stopKioskLoop() {
    isKioskActive.value = false
    stopMonitoring()
    cancelOperation()
  }

  async function runScannerCycle() {
    if (!isKioskActive.value || !isReaderConnected.value || isVerifying.value) return
    
    // Esperar a que el lector detecte una huella
    const matchedIndex = await verifyFingerprint(candidateTemplates.value)
    
    // Si la lectura falló o no coincidió, evaluar si hubo intento real del usuario
    if (matchedIndex === null || matchedIndex < 0) {
      if (isKioskActive.value) {
        // capturedImage tiene valor solo si el lector capturó físicamente un dedo
        // Si no hay imagen, fue un fallo técnico silencioso (sin dedo, sensor ocupado) → reintentar callado
        if (capturedImage.value) {
          // Alguien puso el dedo pero no fue reconocido → feedback visual + audio
          playAlert('FINGERPRINT_NO_MATCH')
          overlayStatus.value = 'error'
          overlayTitle.value = 'Huella no reconocida'
          overlayMessage.value = 'No se pudo identificar su huella. Por favor, intente de nuevo.'

          setTimeout(() => {
            overlayStatus.value = 'idle'
            runScannerCycle()
          }, 2500)
        } else {
          // Fallo técnico silencioso (sin dedo aún) → reintentar sin molestar al usuario
          setTimeout(runScannerCycle, 1500)
        }
      }
      return
    }

    // Huella detectada
    const matchedDiner = mappingArray.value[matchedIndex]
    await dispatchFood(matchedDiner.cedula)
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
      // Uso correcto de Pinia (Regla AGENTS.md)
      const response = await dinersStore.processDispatch(cedula, selectedDiningRoomId.value)
      
      lastDispatchResult.value = response
      overlayStatus.value = 'success'
      overlayTitle.value = '¡Buen Provecho!'
      overlayMessage.value = `${response.diner.name} tiene autorizado su ${response.dispatch.shift}.`
      
      playAlert('SUCCESS')
    } catch (error: any) {
      const isAlreadyDispatched = error.response?.status === 409
      overlayStatus.value = 'error'
      overlayTitle.value = isAlreadyDispatched ? 'Alerta de Duplicidad' : 'Acceso Denegado'
      overlayMessage.value = error.data?.message || 'No se pudo procesar el despacho.'
      
      console.log('[dispatchFood] Error object:', error)
      console.log('[dispatchFood] error.data:', error.data)
      
      const errorCode = error.data?.data?.code || error.data?.code || 'GENERIC_ERROR'
      console.log('[dispatchFood] Extracted code:', errorCode)
      playAlert(errorCode)
    } finally {
      isSearching.value = false
      
      // Bucle Automático: Mostrar el mensaje gigante por 3 segundos y volver al Kiosco
      setTimeout(() => {
        overlayStatus.value = 'idle'
        if (isKioskActive.value) {
          runScannerCycle()
        }
      }, 3000)
    }
  }

  watch(isReaderConnected, (connected) => {
    // Auto-recuperación si el USB se desconecta y vuelve a conectarse
    if (connected && isKioskActive.value && !isVerifying.value) {
      runScannerCycle()
    }
  })

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
    saveDiningRoomSelection,
    processManualDispatch,
    clearSearch,
    stopKioskLoop,
    capturedImage: readonly(capturedImage)
  }
}
