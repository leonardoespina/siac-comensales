import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'

export function useMassMigration() {
  const $q = useQuasar()
  const dinersStore = useDinersStore()

  const isModalOpen = ref(false)
  const isMigrating = ref(false)
  const targetDiningRoomId = ref<number | null>(null)
  
  // Lista de comensales (filas de la tabla) seleccionados
  const selectedDiners = ref<any[]>([])

  const openMigrationModal = () => {
    if (selectedDiners.value.length === 0) {
      $q.notify({ type: 'warning', message: 'Debe seleccionar al menos un comensal para migrar.' })
      return
    }
    targetDiningRoomId.value = null
    isModalOpen.value = true
  }

  const closeMigrationModal = () => {
    isModalOpen.value = false
    targetDiningRoomId.value = null
  }

  const executeMigration = async () => {
    if (!targetDiningRoomId.value) {
      $q.notify({ type: 'warning', message: 'Seleccione un comedor destino.' })
      return
    }

    const ids = selectedDiners.value.map(d => d.id)

    isMigrating.value = true
    try {
      await dinersStore.bulkMigrate(ids, targetDiningRoomId.value)
      
      $q.notify({ 
        type: 'positive', 
        message: `${ids.length} comensal(es) migrado(s) exitosamente.` 
      })
      
      // Limpiar selección y cerrar modal
      selectedDiners.value = []
      closeMigrationModal()
    } catch (error: any) {
      $q.notify({ 
        type: 'negative', 
        message: error.data?.message || 'Error al ejecutar la migración masiva.' 
      })
    } finally {
      isMigrating.value = false
    }
  }

  return {
    isModalOpen,
    isMigrating,
    targetDiningRoomId,
    selectedDiners,
    openMigrationModal,
    closeMigrationModal,
    executeMigration
  }
}
