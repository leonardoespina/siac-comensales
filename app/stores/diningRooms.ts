import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDiningRoomsStore = defineStore('diningRooms', () => {
  const diningRooms = ref<any[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)

  const fetchAll = async () => {
    if (isFetched.value) return
    isLoading.value = true
    try {
      const data = await $fetch('/api/dining-rooms')
      diningRooms.value = data
      isFetched.value = true
    } catch (error) {
      console.error('Error fetching dining rooms', error)
    } finally {
      isLoading.value = false
    }
  }

  const create = async (payload: any) => {
    const res = await $fetch('/api/dining-rooms', {
      method: 'POST',
      body: payload
    })
    diningRooms.value.push(res)
    return res
  }

  const update = async (id: number, payload: any) => {
    const res = await $fetch(`/api/dining-rooms/${id}`, {
      method: 'PUT',
      body: payload
    })
    const index = diningRooms.value.findIndex(r => r.id === id)
    if (index !== -1) diningRooms.value[index] = res
    return res
  }

  const remove = async (id: number) => {
    await $fetch(`/api/dining-rooms/${id}`, {
      method: 'DELETE'
    })
    // En lugar de borrar de la lista, podríamos cambiar su estado a inactivo si queremos mantenerlo
    const item = diningRooms.value.find(r => r.id === id)
    if (item) item.active = false
  }

  return {
    diningRooms,
    isLoading,
    fetchAll,
    create,
    update,
    remove
  }
})
