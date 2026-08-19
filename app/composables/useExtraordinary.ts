import { ref, computed, readonly } from 'vue'
import { useExtraordinaryStore } from '../stores/extraordinary'
import { useDiningRoomsStore } from '../stores/diningRooms'
import { useDependenciesStore } from '../stores/dependencies'
import { useQuasar } from 'quasar'

export function useExtraordinary() {
  const store = useExtraordinaryStore()
  const diningRoomsStore = useDiningRoomsStore()
  const dependenciesStore = useDependenciesStore()
  const $q = useQuasar()

  const isModalOpen = ref(false)
  const isSubmitting = ref(false)
  const searchDate = ref(new Date().toISOString().split('T')[0])
  const searchDiningRoom = ref<number | null>(null)

  // Internal form data to pass to the modal
  const formData = ref<any>(null)

  // Catalogs
  const diningRoomsOptions = computed(() => 
    diningRoomsStore.activeDiningRooms.map(dr => ({ label: dr.name, value: dr.id }))
  )
  const dependenciesOptions = computed(() => 
    dependenciesStore.dependencies
      .filter((d: any) => d.active !== false)
      .map((d: any) => ({ label: d.name, value: d.id }))
  )

  const loadCatalogs = async () => {
    await Promise.all([
      diningRoomsStore.fetchAll(),
      dependenciesStore.fetchAll()
    ])
  }

  const performSearch = async () => {
    await store.fetchHistory({
      date: searchDate.value,
      diningRoomId: searchDiningRoom.value
    })
  }

  const openForm = () => {
    formData.value = {
      id: null,
      personId: '',
      companyName: '',
      shiftType: 'ALMUERZO',
      quantity: 1,
      modality: 'DINE_IN',
      dependencyId: null,
      diningRoomId: searchDiningRoom.value || null,
      observation: ''
    }
    isModalOpen.value = true
  }

  const openEditForm = (row: any) => {
    formData.value = {
      id: row.id,
      personId: row.personId,
      companyName: row.companyName,
      shiftType: row.shiftType,
      quantity: row.quantity,
      modality: row.modality,
      dependencyId: row.dependencyId,
      diningRoomId: row.diningRoomId,
      observation: row.observation || ''
    }
    isModalOpen.value = true
  }

  const confirmDelete = (id: number) => {
    $q.dialog({
      title: 'Eliminar Visita',
      message: '¿Está seguro de eliminar este registro?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.deleteDispatch(id)
        $q.notify({ type: 'positive', message: 'Visita eliminada correctamente.' })
      } catch (error) {
        $q.notify({ type: 'negative', message: 'Error al eliminar visita.' })
      }
    })
  }

  const submitForm = async (payload: any) => {
    isSubmitting.value = true
    try {
      if (payload.id) {
        // UPDATE
        await store.updateDispatch(payload.id, {
          ...payload,
          date: searchDate.value
        })
        $q.notify({ type: 'positive', message: 'Visita actualizada exitosamente.' })
      } else {
        // CREATE
        await store.registerDispatch({
          ...payload,
          date: searchDate.value
        })
        $q.notify({ type: 'positive', message: 'Visita registrada exitosamente.' })
      }
      isModalOpen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar visita' })
    } finally {
      isSubmitting.value = false
    }
  }

  const setModalOpen = (val: boolean) => {
    isModalOpen.value = val
  }
  
  const setSearchDate = (val: string) => {
    searchDate.value = val
  }

  const setSearchDiningRoom = (val: number | null) => {
    searchDiningRoom.value = val
  }

  return {
    // State (Readonly as per architecture rules)
    isModalOpen: readonly(isModalOpen),
    isSubmitting: readonly(isSubmitting),
    searchDate: readonly(searchDate),
    searchDiningRoom: readonly(searchDiningRoom),
    formData: readonly(formData),
    
    // Derived
    dispatches: computed(() => store.dispatches),
    isLoading: computed(() => store.isLoading),
    diningRoomsOptions,
    dependenciesOptions,
    
    // Actions
    loadCatalogs,
    performSearch,
    openForm,
    openEditForm,
    confirmDelete,
    submitForm,
    setModalOpen,
    setSearchDate,
    setSearchDiningRoom
  }
}
