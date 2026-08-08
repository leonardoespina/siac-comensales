import { defineStore } from 'pinia'

export interface Squad {
  id: number
  name: string
  active: boolean
}

export const useSquadsStore = defineStore('squads', {
  state: () => ({
    squads: [] as Squad[],
    isLoading: false,
  }),
  
  actions: {
    async fetchAll() {
      this.isLoading = true
      try {
        const data = await $fetch('/api/squads')
        this.squads = data as Squad[]
      } catch (error) {
        console.error('Error fetching squads:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async createSquad(name: string) {
      await $fetch('/api/squads', {
        method: 'POST',
        body: { name }
      })
      await this.fetchAll()
    },

    async updateSquad(id: number, name: string) {
      await $fetch(`/api/squads/${id}`, {
        method: 'PUT',
        body: { name }
      })
      await this.fetchAll()
    },

    async deleteSquad(id: number) {
      await $fetch(`/api/squads/${id}`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    }
  }
})
