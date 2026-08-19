import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMassiveDispatchStore = defineStore('massiveDispatch', () => {
  const massiveBatches = ref([])
  const dependencies = ref([])
  const loading = ref(false)

  async function loadCatalogs() {
    try {
      const deps = await $fetch('/api/dependencies')
      dependencies.value = deps || []
    } catch (error) {
      console.error('Error cargando catálogos:', error)
      throw error
    }
  }

  async function loadHistory(params: any) {
    loading.value = true
    try {
      const response = await $fetch('/api/dispatch/massive/list', { params })
      massiveBatches.value = response.batches || []
    } catch (error) {
      console.error('Error cargando historial:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function searchBatches(params: any) {
    try {
      const response = await $fetch('/api/dispatch/massive/list', { params })
      return response.batches || []
    } catch (error) {
      console.error('Error buscando lotes:', error)
      throw error
    }
  }

  async function confirmBatchDispatch(batchId: number, scannedCedula: string, force: boolean) {
    try {
      const response = await $fetch('/api/dispatch/massive/confirm', {
        method: 'POST',
        body: { batchId, scannedCedula, force }
      })
      return response
    } catch (error) {
      throw error
    }
  }

  return {
    massiveBatches,
    dependencies,
    loading,
    loadCatalogs,
    loadHistory,
    searchBatches,
    confirmBatchDispatch
  }
})
