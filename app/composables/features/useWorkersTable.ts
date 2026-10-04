import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { usePositionsStore } from '~/stores/positions'
import { useSitesStore } from '~/stores/sites'
import { useAuthStore } from '~/stores/auth'

export function useWorkersTable(formDataDependencyId: any) {
  const $q = useQuasar()
  const squadsStore = useSquadsStore()
  const dinersStore = useDinersStore()
  const depStore = useDependenciesStore()
  const positionsStore = usePositionsStore()
  const sitesStore = useSitesStore()
  const authStore = useAuthStore()

  // Filtros para Admin Global y Búsqueda
  const filterDependencyId = ref<number | null>(null)
  const filterSubdependencyId = ref<number | null>(null)
  const filterStatus = ref<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE')

  const statusOptions = [
    { label: 'Solo Activos', value: 'ACTIVE' },
    { label: 'Solo Inactivos / Desincorporados', value: 'INACTIVE' },
    { label: 'Todos los Registros', value: 'ALL' }
  ]

  // Estado del Smart Filter
  const filterState = ref({
    search: '',
    siteId: null,
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

  // Opciones de Sedes
  const siteOptions = computed(() => {
    return sitesStore.sites
      .filter(site => site.active !== false)
      .map(site => ({
        label: site.name,
        value: site.id
      }))
  })

  // Opciones de Dependencias y Subdependencias (Solo para Admin Global)
  const dependencyOptions = computed(() => {
    return depStore.dependencies.filter(d => d.active !== false)
  })

  // Esquema dinámico para el Smart Filter
  const smartFilterSchema = computed(() => [
    { 
      key: 'siteId', 
      label: 'Sede Base', 
      type: 'select', 
      options: siteOptions.value,
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
    const targetDepId = filterDependencyId.value || authStore.user?.dependencyId
    if (!targetDepId) return []
    const dep = depStore.dependencies.find(d => d.id === targetDepId)
    return (dep?.subdependencies || []).filter((sub: any) => sub.active !== false)
  })

  const subdependencyOptions = computed(() => {
    let depId = formDataDependencyId.value
    
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
    { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left' as const, sortable: true },
    { name: 'name', label: 'Nombre Completo', field: 'name', align: 'left' as const, sortable: true },
    { 
      name: 'site', 
      required: true, 
      label: 'Sede Base', 
      align: 'left' as const, 
      field: (row: any) => row.site?.name || 'No asignada',
      sortable: true
    },
    { name: 'position', label: 'Cargo', field: (row: any) => row.position?.name || 'Sin Cargo', align: 'left' as const, sortable: true },
    { name: 'rationType', label: 'Tipo de Ración', field: 'rationType', align: 'center' as const },
    { name: 'status', label: 'Estado', field: (row: any) => row.active ? 'Activo' : 'Inactivo', align: 'center' as const, sortable: true },
    { name: 'actions', label: 'Opciones', field: 'actions', align: 'center' as const }
  ]

  function fetchCurrentDiners() {
    const params: any = { status: filterStatus.value }
    if (filterSubdependencyId.value) {
      params.subdependencyId = filterSubdependencyId.value
    } else if (filterDependencyId.value) {
      params.dependencyId = filterDependencyId.value
    }
    dinersStore.fetchAll(params)
  }

  const deleteDiner = (diner: any) => {
    $q.dialog({
      title: 'Desincorporar Trabajador',
      message: `¿Estás seguro de desactivar al trabajador <strong>${diner.name}</strong>? Quedará inactivo pero podrás reactivarlo en cualquier momento.`,
      html: true,
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Desactivar', color: 'negative' },
      persistent: true
    }).onOk(async () => {
      try {
        await dinersStore.deleteDiner(diner.id)
        $q.notify({ type: 'positive', message: 'Trabajador desincorporado exitosamente' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al desincorporar trabajador' })
      }
    })
  }

  const reactivateDiner = (diner: any) => {
    $q.dialog({
      title: 'Reactivar Trabajador',
      message: `¿Desea reactivar a <strong>${diner.name}</strong> (${diner.cedula}) para habilitar su acceso al comedor?`,
      html: true,
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Reactivar', color: 'positive' },
      persistent: true
    }).onOk(async () => {
      try {
        await dinersStore.reactivateDiner(diner.id)
        $q.notify({ type: 'positive', message: `¡${diner.name} reactivado exitosamente!` })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al reactivar trabajador' })
      }
    })
  }

  const customFilter = (rows: readonly any[], terms: any) => {
    return rows.filter(row => {
      if (terms.search) {
        const s = terms.search.toLowerCase()
        const matchCedula = row.cedula?.toLowerCase().includes(s)
        const matchName = row.name?.toLowerCase().includes(s)
        if (!matchCedula && !matchName) return false
      }
      
      if (terms.siteId && row.siteId !== terms.siteId) return false
      if (terms.positionId && row.positionId !== terms.positionId) return false
      if (terms.rationType && row.rationType !== terms.rationType) return false
      
      return true
    })
  }

  watch(filterDependencyId, (newVal) => {
    filterSubdependencyId.value = null
    if (newVal) {
      dinersStore.fetchAll({ dependencyId: newVal, status: filterStatus.value })
    } else {
      dinersStore.diners = []
    }
  })

  watch(filterSubdependencyId, (newVal) => {
    if (newVal) {
      dinersStore.fetchAll({ subdependencyId: newVal, status: filterStatus.value })
    } else if (filterDependencyId.value) {
      dinersStore.fetchAll({ dependencyId: filterDependencyId.value, status: filterStatus.value })
    } else {
      dinersStore.diners = []
    }
  })

  watch(filterStatus, () => {
    fetchCurrentDiners()
  })

  return {
    filterDependencyId,
    filterSubdependencyId,
    filterStatus,
    statusOptions,
    filterState,
    rationOptions,
    squadOptions,
    positionOptions,
    siteOptions,
    dependencyOptions,
    smartFilterSchema,
    filterSubdependencyOptions,
    subdependencyOptions,
    userSubdependencyName,
    userDependencyName,
    columns,
    deleteDiner,
    reactivateDiner,
    fetchCurrentDiners,
    customFilter
  }
}
