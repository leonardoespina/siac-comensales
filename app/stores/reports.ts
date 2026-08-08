import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useReportsStore = defineStore('reports', () => {
  const matrixData = ref<{ dispatches: any[], rows: any[] } | null>(null)

  const fetchReceptionsMatrix = async (filters: any) => {
    try {
      const data = await $fetch('/api/reports/receptions-matrix', { query: filters })
      matrixData.value = data as any
      return data
    } catch (error) {
      throw error
    }
  }

  return { matrixData, fetchReceptionsMatrix }
})
