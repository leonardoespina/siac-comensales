import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useBiometrics } from '~/composables/features/useBiometrics'
import { useDinersStore } from '~/stores/diners'

interface UseGeneralIdentificationOptions {
  isOpen: ReturnType<typeof computed>
  onIdentified?: (diner: any) => void
}

export function useGeneralIdentification(options: UseGeneralIdentificationOptions) {
  const $q = useQuasar()
  const dinersStore = useDinersStore()
  
  const {
    isReaderConnected,
    isVerifying,
    startMonitoring,
    stopMonitoring,
    verifyFingerprint,
    cancelOperation
  } = useBiometrics()

  const isLoading = ref(false)
  const candidateTemplates = ref<string[]>([])
  const mappingArray = ref<any[]>([])
  const autoStartEnabled = ref(true)

  const totalTemplates = computed(() => candidateTemplates.value.length)

  // UI States
  const iconColor = computed(() => {
    if (!isReaderConnected.value) return 'grey-6'
    if (isVerifying.value) return 'primary'
    return 'positive'
  })

  const statusTitle = computed(() => {
    if (!isReaderConnected.value) return 'Lector Apagado'
    if (isVerifying.value) return 'Buscando Coincidencia...'
    return 'Listo para Escanear'
  })

  const statusDescription = computed(() => {
    if (!isReaderConnected.value) return 'Conecte el U.are.U 5160 y verifique el middleware'
    if (isVerifying.value) return 'Comparando contra ' + totalTemplates.value + ' huellas...'
    return autoStartEnabled.value ? 'Iniciando sensor...' : 'Haga clic para iniciar la validación 1:N'
  })

  const fetchAllTemplates = async () => {
    isLoading.value = true
    try {
      // Uso del store para la llamada API en cumplimiento del Skill
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
      $q.notify({ type: 'negative', message: 'Error descargando la base de datos biométrica' })
    } finally {
      isLoading.value = false
      if (autoStartEnabled.value && isReaderConnected.value) {
        handleAction()
      }
    }
  }

  const handleAction = async () => {
    if (!isReaderConnected.value || isVerifying.value) return
    if (candidateTemplates.value.length === 0) {
      $q.notify({ type: 'warning', message: 'La base de datos de huellas está vacía.' })
      return
    }

    const matchedIndex = await verifyFingerprint(candidateTemplates.value)
    
    if (matchedIndex !== null && matchedIndex >= 0 && matchedIndex < mappingArray.value.length) {
      const matchedDiner = mappingArray.value[matchedIndex]
      $q.notify({ 
        type: 'positive', 
        message: `Comensal reconocido: ${matchedDiner.name}`,
        icon: 'verified_user'
      })
      if (options.onIdentified) options.onIdentified(matchedDiner)
    } else {
      // Falló la validación o se canceló, intentar de nuevo si el auto-start está activo
      if (autoStartEnabled.value && options.isOpen.value) {
        setTimeout(() => {
          if (options.isOpen.value && !isVerifying.value && isReaderConnected.value && autoStartEnabled.value) {
            handleAction()
          }
        }, 1500)
      }
    }
  }

  const manualStart = () => {
    autoStartEnabled.value = true
    handleAction()
  }

  const handleCancel = () => {
    autoStartEnabled.value = false
    cancelOperation()
  }

  // Lifecycle & Watchers
  watch(isReaderConnected, (connected) => {
    if (connected && options.isOpen.value && !isLoading.value && !isVerifying.value && autoStartEnabled.value) {
      handleAction()
    }
  })

  watch(options.isOpen, (newVal) => {
    if (newVal) {
      autoStartEnabled.value = true
      startMonitoring()
      fetchAllTemplates()
    } else {
      stopMonitoring()
      cancelOperation()
    }
  })

  return {
    isReaderConnected,
    isVerifying,
    isLoading,
    totalTemplates,
    iconColor,
    statusTitle,
    statusDescription,
    manualStart,
    handleCancel
  }
}
