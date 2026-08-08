import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNotifications } from '../composables/core/useNotifications'

export const usePositionsStore = defineStore('positions', () => {
  const positions = ref<any[]>([])
  const loading = ref(false)
  const { notify } = useNotifications()

  async function fetchPositions() {
    loading.value = true
    try {
      const data = await $fetch('/api/positions')
      positions.value = data as any[]
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al cargar los cargos')
    } finally {
      loading.value = false
    }
  }

  async function createPosition(payload: any) {
    const data = await $fetch('/api/positions', {
      method: 'POST',
      body: payload
    })
    await fetchPositions()
    return data
  }

  async function updatePosition(id: number, payload: any) {
    const data = await $fetch(`/api/positions/${id}`, {
      method: 'PUT',
      body: payload
    })
    await fetchPositions()
    return data
  }

  async function deletePosition(id: number) {
    const data = await $fetch(`/api/positions/${id}`, {
      method: 'DELETE'
    })
    await fetchPositions()
    return data
  }

  return {
    positions,
    loading,
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition
  }
})
