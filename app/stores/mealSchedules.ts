import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MealSchedule } from '@prisma/client'

export const useMealSchedulesStore = defineStore('mealSchedules', () => {
  const schedules = ref<MealSchedule[]>([])
  const loading = ref(false)

  async function fetchSchedules() {
    loading.value = true
    try {
      const { data, error } = await useFetch<MealSchedule[]>('/api/meal-schedules')
      if (error.value) throw error.value
      if (data.value) schedules.value = data.value
    } catch (e: any) {
      console.error('Error fetching schedules:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addSchedule(payload: any) {
    const { data, error } = await useFetch<MealSchedule>('/api/meal-schedules', {
      method: 'POST',
      body: payload
    })
    
    if (error.value) {
      throw error.value
    }
    
    if (data.value) {
      schedules.value.push(data.value)
    }
    return data.value
  }

  async function updateSchedule(id: number, payload: any) {
    const { data, error } = await useFetch<MealSchedule>(`/api/meal-schedules/${id}`, {
      method: 'PUT',
      body: payload
    })
    
    if (error.value) {
      throw error.value
    }

    if (data.value) {
      const index = schedules.value.findIndex(s => s.id === id)
      if (index !== -1) {
        schedules.value[index] = data.value
      }
    }
    return data.value
  }

  return {
    schedules,
    loading,
    fetchSchedules,
    addSchedule,
    updateSchedule
  }
})
