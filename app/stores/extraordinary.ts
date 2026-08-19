import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExtraordinaryStore = defineStore('extraordinary', () => {
  const dispatches = ref<any[]>([])
  const isLoading = ref(false)

  const fetchHistory = async (params: { date: string, diningRoomId?: number | null }) => {
    isLoading.value = true
    try {
      const response = await $fetch<any>('/api/extraordinary', { params })
      dispatches.value = response.data || []
    } catch (error) {
      console.error('Error fetching extraordinary dispatches:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const registerDispatch = async (payload: any) => {
    try {
      const response = await $fetch<any>('/api/extraordinary', {
        method: 'POST',
        body: payload
      })
      // Prepend to history if the date matches
      dispatches.value.unshift(response.data)
      return response
    } catch (error) {
      console.error('Error registering extraordinary dispatch:', error)
      throw error
    }
  }

  const autocompleteVisitor = async (query: string) => {
    try {
      const response = await $fetch<any>('/api/extraordinary/autocomplete', {
        params: { q: query }
      })
      return response.data
    } catch (error) {
      return null
    }
  }

  const updateDispatch = async (id: number, payload: any) => {
    try {
      const response = await $fetch<any>(`/api/extraordinary/${id}`, {
        method: 'PUT',
        body: payload
      })
      const index = dispatches.value.findIndex(d => d.id === id)
      if (index !== -1) {
        dispatches.value[index] = { ...dispatches.value[index], ...response.data }
      }
      return response
    } catch (error) {
      console.error('Error updating extraordinary dispatch:', error)
      throw error
    }
  }

  const deleteDispatch = async (id: number) => {
    try {
      await $fetch(`/api/extraordinary/${id}`, {
        method: 'DELETE'
      })
      dispatches.value = dispatches.value.filter(d => d.id !== id)
    } catch (error) {
      console.error('Error deleting extraordinary dispatch:', error)
      throw error
    }
  }

  return {
    dispatches,
    isLoading,
    fetchHistory,
    registerDispatch,
    updateDispatch,
    deleteDispatch,
    autocompleteVisitor
  }
})
