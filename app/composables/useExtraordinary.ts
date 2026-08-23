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

  const getSubdependencies = (depId: number) => {
    const dep = dependenciesStore.dependencies.find((d: any) => d.id === depId)
    if (!dep || !dep.subdependencies) return []
    return dep.subdependencies
      .filter((s: any) => s.active !== false)
      .map((s: any) => ({ label: s.name, value: s.id }))
  }

  const openForm = () => {
    formData.value = {
      id: null,
      date: searchDate.value || new Date().toISOString().split('T')[0],
      personId: '',
      companyName: '',
      shifts: [
        { shiftType: 'DESAYUNO', quantity: 0 },
        { shiftType: 'ALMUERZO', quantity: 1 },
        { shiftType: 'CENA', quantity: 0 },
        { shiftType: 'SOBRECENA', quantity: 0 }
      ],
      modality: 'DINE_IN',
      dependencyId: null,
      subdependencyId: null,
      diningRoomId: searchDiningRoom.value || null,
      observation: ''
    }
    isModalOpen.value = true
  }

  const openEditForm = (row: any) => {
    const shiftsList = [
      { shiftType: 'DESAYUNO', quantity: row.shiftType === 'DESAYUNO' ? row.quantity : 0 },
      { shiftType: 'ALMUERZO', quantity: row.shiftType === 'ALMUERZO' ? row.quantity : 0 },
      { shiftType: 'CENA', quantity: row.shiftType === 'CENA' ? row.quantity : 0 },
      { shiftType: 'SOBRECENA', quantity: row.shiftType === 'SOBRECENA' ? row.quantity : 0 }
    ]

    formData.value = {
      id: row.id,
      originalShiftType: row.shiftType,
      date: new Date(row.date).toISOString().split('T')[0],
      personId: row.personId,
      companyName: row.companyName,
      shifts: shiftsList,
      modality: row.modality,
      dependencyId: row.dependencyId || null,
      subdependencyId: row.subdependencyId || null,
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

  const approveDispatch = async (id: number) => {
    try {
      await store.approveDispatch(id)
      $q.notify({ type: 'positive', message: 'Visita aprobada exitosamente.' })
    } catch (error: any) {
      const msg = error?.data?.message || error?.statusMessage || 'Error al aprobar visita.'
      $q.notify({ type: 'negative', message: msg })
    }
  }

  const rejectDispatch = async (id: number) => {
    $q.dialog({
      title: 'Rechazar Visita',
      message: '¿Está seguro que desea rechazar esta visita?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.rejectDispatch(id)
        $q.notify({ type: 'positive', message: 'Visita rechazada correctamente.' })
      } catch (error: any) {
        const msg = error?.data?.message || error?.statusMessage || 'Error al rechazar visita.'
        $q.notify({ type: 'negative', message: msg })
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
          date: payload.date || searchDate.value
        })
        $q.notify({ type: 'positive', message: 'Visita actualizada exitosamente.' })
      } else {
        // CREATE
        await store.registerDispatch({
          ...payload,
          // Remove specific shift attributes at root level just in case, payload.shifts handles it
          date: payload.date || searchDate.value
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
    setSearchDiningRoom,
    getSubdependencies,
    approveDispatch,
    rejectDispatch
  }
}
