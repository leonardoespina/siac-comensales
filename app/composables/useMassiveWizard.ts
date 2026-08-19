import { ref, computed, readonly, watch, onUnmounted } from 'vue'
import { useMassiveDispatchStore } from '../stores/massiveDispatch'
import { useDinersStore } from '../stores/diners'
import { useDiningRoomsStore } from '../stores/diningRooms'
import { useQuasar } from 'quasar'
import { useBiometrics } from './features/useBiometrics'

export function useMassiveWizard() {
  const store = useMassiveDispatchStore()
  const dinersStore = useDinersStore()
  const diningRoomsStore = useDiningRoomsStore()
  const $q = useQuasar()

  const {
    isReaderConnected,
    isVerifying,
    startMonitoring,
    stopMonitoring,
    verifyFingerprint,
    cancelOperation,
    capturedImage
  } = useBiometrics()

  const isOpen = ref(false)
  const step = ref(1)
  
  const searchDate = ref(new Date().toISOString().split('T')[0])
  const searchDependency = ref<number | null>(null)
  const searchSubdependency = ref<number | null>(null)
  const searchDiningRoom = ref<number | null>(null)

  const isSearching = ref(false)
  const foundBatches = ref([])
  const selectedBatch = ref(null)

  const scannedCedula = ref('')
  const warningMessage = ref('')
  const isDispatching = ref(false)
  const forceDispatch = ref(false)

  const mappingArray = ref<any[]>([])
  const candidateTemplates = ref<string[]>([])

  async function loadBiometrics() {
    try {
      const biometrics = await dinersStore.fetchAllBiometrics()
      const flatTemplates: string[] = []
      const flatMapping: any[] = []

      biometrics.forEach((record: any) => {
        if (record.templates && record.templates.length > 0) {
          record.templates.forEach((t: string) => {
            flatTemplates.push(t)
            flatMapping.push(record.diner)
          })
        }
      })
      candidateTemplates.value = flatTemplates
      mappingArray.value = flatMapping
    } catch (error) {
      console.error('Error loading biometrics for wizard:', error)
    }
  }

  const filteredSubdepsOptions = computed(() => {
    let allSubdeps = []
    if (Array.isArray(store.dependencies)) {
      store.dependencies.forEach((d: any) => {
        if (d.subdependencies) allSubdeps = allSubdeps.concat(d.subdependencies)
      })
    }
    
    if (searchDependency.value) {
      allSubdeps = allSubdeps.filter((s: any) => s.dependencyId === searchDependency.value)
    }
    return allSubdeps.map((s: any) => ({ label: s.name, value: s.id }))
  })

  watch(isOpen, async (newVal) => {
    if (newVal) {
      startMonitoring()
      diningRoomsStore.fetchAll() // Load dining rooms
      if (candidateTemplates.value.length === 0) {
        await loadBiometrics() // Load all biometrics from server
      }
    } else {
      stopMonitoring()
      cancelOperation()
    }
  })

  onUnmounted(() => {
    stopMonitoring()
    cancelOperation()
  })

  async function startScannerCycle() {
    console.log('startScannerCycle triggered', {
      isReaderConnected: isReaderConnected.value,
      isVerifying: isVerifying.value,
      step: step.value,
      templatesCount: candidateTemplates.value.length
    })

    if (!isReaderConnected.value) {
      $q.notify({ type: 'warning', message: 'Lector biométrico desconectado' })
      return
    }
    if (isVerifying.value) {
      $q.notify({ type: 'info', message: 'El lector ya está encendido' })
      return
    }
    if (step.value !== 3) return
    
    if (candidateTemplates.value.length === 0) {
      $q.notify({ type: 'negative', message: 'No hay huellas cargadas en memoria' })
      return
    }

    try {
      const matchedIndex = await verifyFingerprint(candidateTemplates.value)
      
      if (matchedIndex === null || matchedIndex < 0) {
        return // Cancelled or failed
      }
      
      const matchedDiner = mappingArray.value[matchedIndex]
      promptConfirmation(matchedDiner.cedula, matchedDiner.name, store.fetchHistory)
      
    } catch (error) {
      // Ignore abort errors
    }
  }

  function promptConfirmation(cedula: string, name: string, onSuccessCallback: () => void) {
    $q.dialog({
      title: 'Confirmar Retiro Masivo',
      message: `Se ha identificado a: <strong>${name}</strong> (C.I. ${cedula}).<br><br>¿Confirma que esta persona retira el servicio masivo?`,
      html: true,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      scannedCedula.value = cedula
      await processDispatch(onSuccessCallback)
    }).onCancel(() => {
      scannedCedula.value = ''
      capturedImage.value = null // clear image
    })
  }

  async function handleManualSubmit(onSuccessCallback: () => void) {
    if (!scannedCedula.value) {
      $q.notify({ type: 'warning', message: 'Debe ingresar una cédula' })
      return
    }

    const cedula = scannedCedula.value.trim()
    let name = 'Usuario Desconocido'
    let isUnknown = true

    try {
      const foundInMapping = mappingArray.value.find(d => d.cedula === cedula)
      if (foundInMapping) {
        name = foundInMapping.name
        isUnknown = false
      } else {
        const result = await $fetch<any>(`/api/diners/cedula/${cedula}`)
        if (result && result.name) {
          name = result.name
          isUnknown = false
        }
      }
    } catch (error) {
      console.log('Diner not found by cedula')
    }
    
    if (isUnknown) {
      $q.notify({ 
        type: 'negative', 
        message: `La cédula ${cedula} no está registrada o no pertenece a la dependencia. No se puede proceder.` 
      })
      scannedCedula.value = ''
      return
    }
    
    promptConfirmation(cedula, name, onSuccessCallback)
  }

  function open() {
    step.value = 1
    searchDate.value = new Date().toISOString().split('T')[0]
    searchDependency.value = null
    searchSubdependency.value = null
    searchDiningRoom.value = null
    foundBatches.value = []
    selectedBatch.value = null
    scannedCedula.value = ''
    warningMessage.value = ''
    forceDispatch.value = false
    capturedImage.value = null
    isOpen.value = true
  }

  function resetSelection() {
    searchSubdependency.value = null
  }

  async function performSearch() {
    isSearching.value = true
    try {
      const params = {
        date: searchDate.value,
        dependencyId: searchDependency.value,
        subdependencyId: searchSubdependency.value,
        diningRoomId: searchDiningRoom.value
      }
      
      const batches = await store.searchBatches(params)
      foundBatches.value = batches
      selectedBatch.value = null
      step.value = 2 // Move to step 2 automatically
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error buscando solicitudes masivas' })
    } finally {
      isSearching.value = false
    }
  }

  async function processDispatch(onSuccessCallback: () => void) {
    if (!scannedCedula.value) {
      $q.notify({ type: 'warning', message: 'Debe ingresar o escanear una cédula' })
      return
    }

    isDispatching.value = true
    warningMessage.value = ''

    try {
      const response: any = await store.confirmBatchDispatch(
        selectedBatch.value.id, 
        scannedCedula.value.trim(), 
        forceDispatch.value
      )

      $q.notify({ type: 'positive', message: response.message })
      isOpen.value = false
      if (onSuccessCallback) onSuccessCallback()
    } catch (error: any) {
      const errData = error.response?._data
      if (errData?.statusCode === 'DIFFERENT_DEPENDENCY') {
        warningMessage.value = errData.message
        forceDispatch.value = true
      } else {
        $q.notify({ type: 'negative', message: errData?.message || 'Error al procesar el despacho' })
        scannedCedula.value = ''
      }
    } finally {
      isDispatching.value = false
    }
  }

  return {
    // State (Readonly for UI protection)
    isOpen,
    step,
    searchDate,
    searchDependency,
    searchSubdependency,
    searchDiningRoom,
    isSearching,
    foundBatches: readonly(foundBatches),
    selectedBatch,
    scannedCedula,
    warningMessage: readonly(warningMessage),
    isDispatching: readonly(isDispatching),
    
    // Derived
    filteredSubdepsOptions,
    diningRoomsOptions: computed(() => 
      diningRoomsStore.activeDiningRooms.map(dr => ({ label: dr.name, value: dr.id }))
    ),
    isReaderConnected: readonly(isReaderConnected),
    isVerifying: readonly(isVerifying),
    capturedImage: readonly(capturedImage),
    
    // Actions
    open,
    resetSelection,
    performSearch,
    processDispatch,
    startScannerCycle,
    handleManualSubmit
  }
}
