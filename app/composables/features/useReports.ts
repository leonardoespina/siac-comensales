import { ref } from 'vue'

export function useReports() {
  const loading = ref(true)

  // Estados de cada reporte
  const totalGlobalValue = ref(0)
  const warehousesValue = ref<any[]>([])
  
  const alerts = ref<any[]>([])
  
  const minMaxStats = ref<any[]>([])
  
  const totalConsumptionItems = ref(0)
  const totalLossItems = ref(0)
  const totalConsumptionValue = ref(0)
  const totalLossValue = ref(0)
  const consumptionDetails = ref<any[]>([])
  const consumptionSummaryByWarehouse = ref<any[]>([])
  const lossSummaryByWarehouse = ref<any[]>([])
  const consumptionSummaryByMonth = ref<any[]>([])
  
  const institutionsSummary = ref<any[]>([])
  const institutionsDetails = ref<any[]>([])
  const supportSummaryByWarehouse = ref<any[]>([])
  const totalSupportItems = ref(0)
  const totalSupportValue = ref(0)

  // Funciones de fetch
  const fetchValueReport = async () => {
    loading.value = true
    try {
      const data: any = await $fetch('/api/reports/value')
      totalGlobalValue.value = data.totalGlobalValue
      warehousesValue.value = data.warehouses
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const fetchAlertsReport = async () => {
    loading.value = true
    try {
      alerts.value = await $fetch('/api/reports/alerts')
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const fetchMinMaxReport = async () => {
    loading.value = true
    try {
      minMaxStats.value = await $fetch('/api/reports/minmax')
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const fetchConsumptionsReport = async (startDate: string, endDate: string, warehouseId: number | null) => {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (startDate) query.append('startDate', startDate)
      if (endDate) query.append('endDate', endDate)
      if (warehouseId) query.append('warehouseId', warehouseId.toString())
      
      const data: any = await $fetch(`/api/reports/consumptions?${query.toString()}`)
      totalConsumptionItems.value = data.totalConsumptionItems || 0
      totalLossItems.value = data.totalLossItems || 0
      totalConsumptionValue.value = data.totalConsumptionValue || 0
      totalLossValue.value = data.totalLossValue || 0
      consumptionDetails.value = data.details || []
      consumptionSummaryByWarehouse.value = data.summaryByWarehouse || []
      lossSummaryByWarehouse.value = data.lossSummaryByWarehouse || []
      consumptionSummaryByMonth.value = data.consumptionSummaryByMonth || []
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const fetchInstitutionsReport = async (startDate: string, endDate: string, warehouseId?: number | null) => {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (startDate) query.append('startDate', startDate)
      if (endDate) query.append('endDate', endDate)
      if (warehouseId) query.append('warehouseId', warehouseId.toString())
      
      const data: any = await $fetch(`/api/reports/institutions?${query.toString()}`)
      institutionsSummary.value = data.summary || []
      institutionsDetails.value = data.details || []
      supportSummaryByWarehouse.value = data.summaryByWarehouse || []
      totalSupportItems.value = data.totalSupportItems || 0
      totalSupportValue.value = data.totalSupportValue || 0
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    
    totalGlobalValue,
    warehousesValue,
    fetchValueReport,
    
    alerts,
    fetchAlertsReport,
    
    minMaxStats,
    fetchMinMaxReport,
    
    totalConsumptionItems,
    totalLossItems,
    totalConsumptionValue,
    totalLossValue,
    consumptionDetails,
    consumptionSummaryByWarehouse,
    lossSummaryByWarehouse,
    consumptionSummaryByMonth,
    fetchConsumptionsReport,
    
    institutionsSummary,
    institutionsDetails,
    supportSummaryByWarehouse,
    totalSupportItems,
    totalSupportValue,
    fetchInstitutionsReport
  }
}
