import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDinerRequestsStore = defineStore('dinerRequests', () => {
  const requests = ref<any[]>([])
  const loading = ref(false)

  async function fetchRequests(startDate: string, endDate: string) {
    loading.value = true
    try {
      const { data, error } = await useFetch<any[]>('/api/diner-requests', {
        query: { startDate, endDate }
      })
      if (error.value) throw error.value
      if (data.value) requests.value = data.value
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createRequests(payload: any) {
    const { data, error } = await useFetch('/api/diner-requests', {
      method: 'POST',
      body: payload
    })
    if (error.value) throw error.value
    return data.value
  }

  async function deleteRequest(id: number) {
    const { error } = await useFetch(`/api/diner-requests/${id}`, {
      method: 'DELETE'
    })
    if (error.value) throw error.value
    // Remover localmente para no tener que recargar todo
    requests.value = requests.value.filter(r => r.id !== id)
  }

  return {
    requests,
    loading,
    fetchRequests,
    createRequests,
    deleteRequest
  }
})
