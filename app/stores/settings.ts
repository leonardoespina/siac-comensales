import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNotifications } from '~/composables/core/useNotifications'

export const useSettingsStore = defineStore('settings', () => {
  const minDaysAhead = ref(1)
  const cutoffTime = ref({ hours: 10, minutes: 30 })
  const settings = ref<any[]>([])
  const loading = ref(false)
  const { notify } = useNotifications()

  async function fetchCutoffRules() {
    loading.value = true
    try {
      const res = await $fetch('/api/settings/cutoff')
      minDaysAhead.value = res.minDaysAhead
      cutoffTime.value = res.cutoffTime
    } catch (e: any) {
      console.error(e)
      notify.error('Error al cargar reglas de límite de tiempo.')
    } finally {
      loading.value = false
    }
  }

  async function fetchSettings() {
    loading.value = true
    try {
      const res = await $fetch('/api/settings')
      settings.value = res as any[]
    } catch (e: any) {
      console.error(e)
      notify.error('Error al cargar configuraciones globales.')
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(newSettings: any[]) {
    loading.value = true
    try {
      const res = await $fetch('/api/settings', {
        method: 'PUT',
        body: newSettings
      })
      settings.value = res as any[]
      // También refrescamos las variables reactivas inmediatas
      await fetchCutoffRules()
      return true
    } catch (e: any) {
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    minDaysAhead,
    cutoffTime,
    settings,
    loading,
    fetchCutoffRules,
    fetchSettings,
    updateSettings
  }
})
