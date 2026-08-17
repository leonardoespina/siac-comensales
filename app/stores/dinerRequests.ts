import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDinerRequestsStore = defineStore('dinerRequests', () => {
  const requests = ref<any[]>([])
  const loading = ref(false)

  async function fetchRequests(startDate: string, endDate: string) {
    loading.value = true
    try {
      const data = await $fetch<any[]>('/api/diner-requests', {
        query: { startDate, endDate }
      })
      requests.value = data
    } catch (e: any) {
      console.error(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createRequests(payload: any) {
    try {
      const data = await $fetch('/api/diner-requests', {
        method: 'POST',
        body: payload
      })
      return data
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  async function deleteRequest(id: number) {
    try {
      await $fetch(`/api/diner-requests/${id}`, {
        method: 'DELETE'
      })
      // Remover localmente para no tener que recargar todo
      requests.value = requests.value.filter(r => r.id !== id)
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  async function deleteRequestsBulk(ids: number[]) {
    try {
      await $fetch('/api/diner-requests/bulk', {
        method: 'DELETE',
        body: { ids }
      })
      requests.value = requests.value.filter(r => !ids.includes(r.id))
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  async function updateRequestBatch(batchOrId: string, payload: any) {
    try {
      const data = await $fetch(`/api/diner-requests/${batchOrId}`, {
        method: 'PUT',
        body: payload
      })
      return data
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  return {
    requests,
    loading,
    fetchRequests,
    createRequests,
    deleteRequest,
    deleteRequestsBulk,
    updateRequestBatch
  }
})
