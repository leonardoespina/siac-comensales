import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { usePositionsStore } from '~/stores/positions'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useAuthStore } from '~/stores/auth'

export function useWorkersTable(formDataDependencyId: any) {
  const $q = useQuasar()
  const squadsStore = useSquadsStore()
  const dinersStore = useDinersStore()
  const depStore = useDependenciesStore()
  const positionsStore = usePositionsStore()
  const diningRoomsStore = useDiningRoomsStore()
  const authStore = useAuthStore()

  // Filtros para Admin Global y Búsqueda
  const filterDependencyId = ref<number | null>(null)
  const filterSubdependencyId = ref<number | null>(null)

  // Estado del Smart Filter
  const filterState = ref({
    search: '',
    diningRoomId: null,
    positionId: null,
    rationType: null
  })

  // Opciones de Ración
  const rationOptions = [
    { label: 'Normal (Plato Estándar)', value: 'NORMAL' },
    { label: 'Dieta Médica', value: 'DIETA' }
  ]

  // Extraemos las cuadrillas globales para el Select
  const squadOptions = computed(() => {
    return squadsStore.squads
      .filter(squad => squad.active !== false)
      .map(squad => ({
        label: squad.name,
        value: squad.id
      }))
  })

  // Opciones de Cargos
  const positionOptions = computed(() => {
    return positionsStore.positions
      .filter(pos => pos.active !== false)
      .map(pos => ({
        label: pos.name,
        value: pos.id
      }))
  })

  // Opciones de Comedores
  const diningRoomOptions = computed(() => {
    return diningRoomsStore.diningRooms
      .filter(dr => dr.active !== false)
      .map(dr => ({
        label: dr.name,
        value: dr.id
      }))
  })

  // Opciones de Dependencias y Subdependencias (Solo para Admin Global)
  const dependencyOptions = computed(() => {
    return depStore.dependencies.filter(d => d.active !== false)
  })

  // Esquema dinámico para el Smart Filter
  const smartFilterSchema = computed(() => [
    { 
      key: 'diningRoomId', 
      label: 'Comedor Base', 
      type: 'select', 
      options: diningRoomOptions.value,
      colSpan: 4
    },
    { 
      key: 'positionId', 
      label: 'Cargo', 
      type: 'select', 
      options: positionOptions.value,
      colSpan: 4
    },
    { 
      key: 'rationType', 
      label: 'Tipo de Ración', 
      type: 'select', 
      options: rationOptions,
      colSpan: 4
    }
  ])

  // Opciones de subdependencia para los filtros de la tabla
  const filterSubdependencyOptions = computed(() => {
    if (!filterDependencyId.value) return []
    const dep = depStore.dependencies.find(d => d.id === filterDependencyId.value)
    return (dep?.subdependencies || []).filter((sub: any) => sub.active !== false)
  })

  const subdependencyOptions = computed(() => {
    let depId = formDataDependencyId.value
    
    // Si no seleccionaron dependencia (porque están en el v-else-if), 
    // autodetectamos a qué dependencia pertenece su subdependencyId
    if (!depId && authStore.user?.dependencyId) {
      depId = authStore.user.dependencyId
    } else if (!depId && authStore.user?.subdependencyId) {
      for (const dep of depStore.dependencies) {
        if (dep.subdependencies?.some(sub => sub.id === authStore.user!.subdependencyId)) {
          depId = dep.id
          break
        }
      }
    }
    
    if (!depId) return []
    const dep = depStore.dependencies.find(d => d.id === depId)
    return (dep?.subdependencies || []).filter((sub: any) => sub.active !== false)
  })

  // Computado para mostrar el nombre de la subdependencia del usuario logueado
  const userSubdependencyName = computed(() => {
    if (authStore.user?.subdependencyId) {
      for (const dep of depStore.dependencies) {
        const sub = dep.subdependencies?.find(s => s.id === authStore.user!.subdependencyId)
        if (sub) return sub.name
      }
    }
    return ''
  })

  const userDependencyName = computed(() => {
    if (authStore.user?.subdependencyId) {
      for (const dep of depStore.dependencies) {
        if (dep.subdependencies?.some(sub => sub.id === authStore.user!.subdependencyId)) {
          return dep.name
        }
      }
    }
    return ''
  })

  const columns = [
    { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
    { name: 'name', label: 'Nombre Completo', field: 'name', align: 'left', sortable: true },
    { name: 'diningRoom', label: 'Comedor Base', field: (row: any) => row.diningRoom?.name || 'No Asignado', align: 'left', sortable: true },
    { name: 'position', label: 'Cargo', field: (row: any) => row.position?.name || 'Sin Cargo', align: 'left', sortable: true },
    { name: 'rationType', label: 'Tipo de Ración', field: 'rationType', align: 'center' },
    { name: 'actions', label: 'Opciones', field: 'actions', align: 'center' }
  ]

  const deleteDiner = (diner: any) => {
    $q.dialog({
      title: 'Confirmar',
      message: `¿Estás seguro de eliminar al trabajador ${diner.name}?`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await dinersStore.deleteDiner(diner.id)
        $q.notify({ type: 'positive', message: 'Trabajador eliminado exitosamente' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar trabajador' })
      }
    })
  }

  // Método de filtrado local personalizado para q-table
  const customFilter = (rows: readonly any[], terms: any) => {
    return rows.filter(row => {
      // 1. Filtrado por texto libre (Cédula o Nombre)
      if (terms.search) {
        const s = terms.search.toLowerCase()
        const matchCedula = row.cedula?.toLowerCase().includes(s)
        const matchName = row.name?.toLowerCase().includes(s)
        if (!matchCedula && !matchName) return false
      }
      
      // 2. Filtrado exacto por Selects
      if (terms.diningRoomId && row.diningRoomId !== terms.diningRoomId) return false
      if (terms.positionId && row.positionId !== terms.positionId) return false
      if (terms.rationType && row.rationType !== terms.rationType) return false
      
      return true
    })
  }

  // Watchers para los filtros de Admin Global
  watch(filterDependencyId, (newVal) => {
    // Al cambiar la dependencia, limpiamos la subdependencia y la tabla
    filterSubdependencyId.value = null
    if (newVal) {
      dinersStore.fetchAll({ dependencyId: newVal })
    } else {
      dinersStore.diners = []
    }
  })

  watch(filterSubdependencyId, (newVal) => {
    if (newVal) {
      dinersStore.fetchAll({ subdependencyId: newVal })
    } else if (filterDependencyId.value) {
      dinersStore.fetchAll({ dependencyId: filterDependencyId.value })
    } else {
      dinersStore.diners = []
    }
  })

  return {
    filterDependencyId,
    filterSubdependencyId,
    filterState,
    rationOptions,
    squadOptions,
    positionOptions,
    diningRoomOptions,
    dependencyOptions,
    smartFilterSchema,
    filterSubdependencyOptions,
    subdependencyOptions,
    userSubdependencyName,
    userDependencyName,
    columns,
    deleteDiner,
    customFilter
  }
}
