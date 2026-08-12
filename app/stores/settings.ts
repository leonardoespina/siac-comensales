import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<any[]>([])
  const loading = ref(false)

  async function fetchSettings() {
    loading.value = true
    try {
      const { data, error } = await useFetch<any[]>('/api/settings')
      if (error.value) throw error.value
      if (data.value) settings.value = data.value
    } catch (e: any) {
      console.error('Error fetching settings:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: any[]) {
    const { data, error } = await useFetch<any[]>('/api/settings', {
      method: 'PUT',
      body: payload
    })
    
    if (error.value) throw error.value
    if (data.value) settings.value = data.value
    return data.value
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings
  }
})
