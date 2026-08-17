import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MealSchedule } from '@prisma/client'

export const useMealSchedulesStore = defineStore('mealSchedules', () => {
  const schedules = ref<MealSchedule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSchedules() {
    loading.value = true
    try {
      const data = await $fetch<MealSchedule[]>('/api/meal-schedules')
      schedules.value = data
      error.value = null
    } catch (e: any) {
      error.value = e.message || 'Error fetching schedules'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addSchedule(payload: any) {
    try {
      const data = await $fetch<MealSchedule>('/api/meal-schedules', {
        method: 'POST',
        body: payload
      })
      schedules.value.push(data)
      return data
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  async function updateSchedule(id: number, payload: any) {
    try {
      const data = await $fetch<MealSchedule>(`/api/meal-schedules/${id}`, {
        method: 'PUT',
        body: payload
      })
      const index = schedules.value.findIndex(s => s.id === id)
      if (index !== -1) {
        schedules.value[index] = data
      }
      return data
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    addSchedule,
    updateSchedule
  }
})
