import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Site {
  id: number
  name: string
  description: string | null
  active: boolean
}

export const useSitesStore = defineStore('sites', () => {
  const sites = ref<Site[]>([])
  const loading = ref(false)

  const fetchSites = async () => {
    loading.value = true
    try {
      const response = await $fetch('/api/sites')
      sites.value = response as Site[]
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      loading.value = false
    }
  }

  const create = async (data: any) => {
    const response = await $fetch('/api/sites', {
      method: 'POST',
      body: data
    })
    sites.value.push(response as Site)
    sites.value.sort((a, b) => a.name.localeCompare(b.name))
  }

  const update = async (id: number, data: any) => {
    const response = await $fetch(`/api/sites/${id}`, {
      method: 'PUT',
      body: data
    })
    const index = sites.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sites.value[index] = response as Site
      sites.value.sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  const remove = async (id: number) => {
    const response = await $fetch(`/api/sites/${id}`, {
      method: 'DELETE',
      body: { active: false }
    })
    const index = sites.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sites.value[index] = response as Site
    }
  }

  return {
    sites,
    loading,
    fetchSites,
    create,
    update,
    remove
  }
})
