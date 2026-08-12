import { ref, computed } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/core/useNotifications'
import dayjs from 'dayjs'

export function useDinerRequestForm() {
  const store = useDinerRequestsStore()
  const authStore = useAuthStore()
  const { notify } = useNotifications()

  const loading = ref(false)
  const isOpen = ref(false)

  // Filtros del panel izquierdo
  const filters = ref({
    dependencyId: authStore.user?.dependencyId || null as number | null,
    subdependencyId: authStore.user?.subdependencyId || null as number | null,
    squadId: null as number | null,
    dateFrom: dayjs().format('YYYY-MM-DD'),
    dateTo: dayjs().format('YYYY-MM-DD'),
    diningRoomId: null as number | null,
    observations: '',
    isExtraordinary: false // Mapeado de "Retiro Mara" o "Tipo Lunch" por ahora
  })

  // Lista de comensales en la grilla
  const loadedDiners = ref<any[]>([])

  // Estado de los checkboxes por cada comensal: { [dinerId]: { [shiftType]: boolean } }
  const gridState = ref<Record<number, Record<string, boolean>>>({})

  function initGridStateForDiners(diners: any[], shiftTypes: string[]) {
    // Preservar el estado anterior si el comensal ya estaba en la grilla
    const newState: Record<number, Record<string, boolean>> = {}
    
    for (const diner of diners) {
      newState[diner.id] = gridState.value[diner.id] || {}
      for (const shift of shiftTypes) {
        if (newState[diner.id][shift] === undefined) {
          newState[diner.id][shift] = false
        }
      }
    }
    gridState.value = newState
  }

  function toggleAll(shiftType: string, checked: boolean) {
    for (const diner of loadedDiners.value) {
      if (!gridState.value[diner.id]) gridState.value[diner.id] = {}
      gridState.value[diner.id][shiftType] = checked
    }
  }

  function addManualDiner(diner: any, shiftTypes: string[]) {
    if (!loadedDiners.value.find(d => d.id === diner.id)) {
      loadedDiners.value.push(diner)
      initGridStateForDiners(loadedDiners.value, shiftTypes)
    }
  }

  function clearForm() {
    filters.value.dependencyId = authStore.user?.dependencyId || null
    filters.value.subdependencyId = authStore.user?.subdependencyId || null
    filters.value.squadId = null
    filters.value.diningRoomId = null
    filters.value.observations = ''
    filters.value.isExtraordinary = false
    loadedDiners.value = []
    gridState.value = {}
  }

  function openCreate() {
    clearForm()
    isOpen.value = true
  }

  async function submit(shiftTypes: string[]) {
    if (!filters.value.dateFrom || !filters.value.dateTo) {
      notify.warning('Debe seleccionar el rango de fechas (Desde - Hasta)')
      return
    }

    // Generar array de fechas en el rango
    let datesArray: string[] = []
    const start = dayjs(filters.value.dateFrom)
    const end = dayjs(filters.value.dateTo)
    
    if (start.isAfter(end)) {
      notify.warning('La fecha Desde no puede ser mayor a la fecha Hasta')
      return
    }

    let current = start
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      datesArray.push(current.format('YYYY-MM-DD'))
      current = current.add(1, 'day')
    }

    loading.value = true
    let successCount = 0
    let errorCount = 0

    try {
      // Agrupar peticiones por Turno
      for (const shift of shiftTypes) {
        const dinerIdsForShift = loadedDiners.value
          .filter(d => gridState.value[d.id]?.[shift])
          .map(d => d.id)

        if (dinerIdsForShift.length > 0) {
          try {
            await store.createRequests({
              dates: datesArray,
              shiftType: shift,
              isExtraordinary: filters.value.isExtraordinary,
              diningRoomId: filters.value.diningRoomId,
              dinerIds: dinerIdsForShift
            })
            successCount++
          } catch (e: any) {
            console.error(e)
            notify.error(`Error al procesar el turno ${shift}: ${e.data?.statusMessage || 'Conflicto de fecha o duplicado'}`)
            errorCount++
          }
        }
      }

      if (successCount > 0) {
        notify.success('Solicitudes enviadas exitosamente bajo un código de lote.')
        clearForm()
      } else if (errorCount === 0) {
        notify.warning('No seleccionó ningún comensal para ningún turno')
      }

    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    filters,
    loadedDiners,
    gridState,
    initGridStateForDiners,
    toggleAll,
    addManualDiner,
    submit,
    isOpen,
    openCreate
  }
}
