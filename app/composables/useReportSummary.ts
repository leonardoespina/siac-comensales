import { ref, computed, readonly } from 'vue'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useDependenciesStore } from '~/stores/dependencies'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'
import * as xlsx from 'xlsx'

export function useReportSummary() {
  const diningRoomsStore = useDiningRoomsStore()
  const dependenciesStore = useDependenciesStore()
  const authStore = useAuthStore()
  const $q = useQuasar()

  const loading = ref(false)
  const dateFrom = ref(new Date().toISOString().split('T')[0])
  const dateTo = ref(new Date().toISOString().split('T')[0])
  const groupBy = ref<'DEPENDENCY' | 'SUBDEPENDENCY'>('DEPENDENCY')
  const selectedDiningRoomId = ref<number | null>(null)
  const selectedDependencyId = ref<number | null>(null)
  const selectedStatus = ref<string | null>(null)

  const rows = ref<any[]>([])
  const totals = ref<any>({
    desayuno: 0,
    almuerzo: 0,
    cena: 0,
    sobrecena: 0,
    grandTotal: 0
  })

  // Options
  const diningRoomsOptions = computed(() =>
    diningRoomsStore.activeDiningRooms.map(dr => ({ label: dr.name, value: dr.id }))
  )

  const statusOptions = [
    { label: 'Todas las Solicitudes', value: null },
    { label: 'Solo Platos Despachados', value: 'DESPACHADAS' },
    { label: 'Pendientes por Despachar', value: 'APPROVED' }
  ]

  const dependenciesOptions = computed(() => {
    const list = dependenciesStore.dependencies
      .filter((d: any) => d.active !== false)
      .map((d: any) => ({ label: d.name, value: d.id }))
    return [{ label: 'Todas las Gerencias', value: null }, ...list]
  })

  const loadCatalogs = async () => {
    await Promise.all([
      diningRoomsStore.fetchAll(),
      dependenciesStore.fetchAll()
    ])
  }

  const fetchReport = async () => {
    loading.value = true
    try {
      const data = await $fetch<any>('/api/reports/summary', {
        params: {
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
          groupBy: groupBy.value,
          diningRoomId: selectedDiningRoomId.value,
          dependencyId: selectedDependencyId.value,
          status: selectedStatus.value
        }
      })
      rows.value = data.rows || []
      totals.value = data.totals || { desayuno: 0, almuerzo: 0, cena: 0, sobrecena: 0, grandTotal: 0 }
    } catch (error: any) {
      $q.notify({
        type: 'negative',
        message: error.data?.message || 'Error al consultar el resumen de gerencias'
      })
    } finally {
      loading.value = false
    }
  }

  const exportExcel = () => {
    if (rows.value.length === 0) {
      $q.notify({ type: 'warning', message: 'No hay datos para exportar' })
      return
    }

    const excelData = rows.value.map(r => {
      if (groupBy.value === 'SUBDEPENDENCY') {
        return {
          'GERENCIA': r.dependencyName || 'N/A',
          'SUBDEPENDENCIA': r.name,
          'DESAYUNO': r.desayuno,
          'ALMUERZO': r.almuerzo,
          'CENA': r.cena,
          'SOBRE-CENA': r.sobrecena,
          'Total general': r.total
        }
      }
      return {
        'GERENCIA': r.name,
        'DESAYUNO': r.desayuno,
        'ALMUERZO': r.almuerzo,
        'CENA': r.cena,
        'SOBRE-CENA': r.sobrecena,
        'Total general': r.total
      }
    })

    // Add totals row
    if (groupBy.value === 'SUBDEPENDENCY') {
      excelData.push({
        'GERENCIA': 'Total general',
        'SUBDEPENDENCIA': '',
        'DESAYUNO': totals.value.desayuno,
        'ALMUERZO': totals.value.almuerzo,
        'CENA': totals.value.cena,
        'SOBRE-CENA': totals.value.sobrecena,
        'Total general': totals.value.grandTotal
      })
    } else {
      excelData.push({
        'GERENCIA': 'Total general',
        'DESAYUNO': totals.value.desayuno,
        'ALMUERZO': totals.value.almuerzo,
        'CENA': totals.value.cena,
        'SOBRE-CENA': totals.value.sobrecena,
        'Total general': totals.value.grandTotal
      })
    }

    const ws = xlsx.utils.json_to_sheet(excelData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Resumen Gerencias')
    xlsx.writeFile(wb, `Resumen_Gerencias_${dateFrom.value}_al_${dateTo.value}.xlsx`)
  }

  const setGroupBy = (val: 'DEPENDENCY' | 'SUBDEPENDENCY') => {
    groupBy.value = val
    fetchReport()
  }

  const setDateFrom = (val: string) => {
    dateFrom.value = val
  }

  const setDateTo = (val: string) => {
    dateTo.value = val
  }

  const setSelectedDiningRoomId = (val: number | null) => {
    selectedDiningRoomId.value = val
  }

  const setSelectedDependencyId = (val: number | null) => {
    selectedDependencyId.value = val
    fetchReport()
  }

  const setSelectedStatus = (val: string | null) => {
    selectedStatus.value = val
    fetchReport()
  }

  return {
    // Readonly State
    loading: readonly(loading),
    dateFrom: readonly(dateFrom),
    dateTo: readonly(dateTo),
    groupBy: readonly(groupBy),
    selectedDiningRoomId: readonly(selectedDiningRoomId),
    selectedDependencyId: readonly(selectedDependencyId),
    selectedStatus: readonly(selectedStatus),
    rows: readonly(rows),
    totals: readonly(totals),
    diningRoomsOptions,
    dependenciesOptions,
    statusOptions,

    // Actions
    loadCatalogs,
    fetchReport,
    exportExcel,
    setGroupBy,
    setDateFrom,
    setDateTo,
    setSelectedDiningRoomId,
    setSelectedDependencyId,
    setSelectedStatus
  }
}
