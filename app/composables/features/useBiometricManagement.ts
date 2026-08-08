import { ref, readonly } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'

export function useBiometricManagement() {
  const $q = useQuasar()
  const store = useDinersStore()

  const searchCedula = ref('')
  const isSearching = ref(false)
  const searchAttempted = ref(false)
  const diner = ref<any>(null)
  const isBiometricModalOpen = ref(false)
  const isGeneralIdentificationModalOpen = ref(false)

  async function searchDiner() {
    if (!searchCedula.value) return
    
    isSearching.value = true
    searchAttempted.value = true
    diner.value = null
    
    const queryCedula = searchCedula.value.trim().toUpperCase()

    try {
      diner.value = await store.fetchByCedula(queryCedula)
    } catch (error: any) {
      if (error.response?.status !== 404) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al buscar comensal' })
      }
    } finally {
      isSearching.value = false
    }
  }

  function clearSearch() {
    searchCedula.value = ''
    diner.value = null
    searchAttempted.value = false
  }

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
    searchDiner() // Refresca los datos para mostrar que ya tiene huella
  }

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
        $q.notify({ type: 'positive', message: 'Huella borrada exitosamente' })
        searchDiner() // Refresca el panel actual
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al borrar huella' })
      }
    })
  }

  return {
    searchCedula,
    isSearching: readonly(isSearching),
    searchAttempted: readonly(searchAttempted),
    diner: readonly(diner),
    isBiometricModalOpen,
    isGeneralIdentificationModalOpen,
    searchDiner,
    clearSearch,
    openBiometricModal,
    openGeneralIdentificationModal,
    onGeneralIdentification,
    onFingerprintSaved,
    confirmDeleteFingerprint
  }
}
