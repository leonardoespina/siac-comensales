import { defineStore } from 'pinia'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [] as any[]
  }),
  actions: {
    async fetchUsers() {
      this.users = await $fetch('/api/users')
      return this.users
    },
    async createUser(payload: any) {
      const newUser = await $fetch('/api/users', { method: 'POST', body: payload })
      this.users.unshift(newUser)
      return newUser
    },
    async updateUser(id: number, payload: any) {
      const updated = await $fetch(`/api/users/${id}`, { method: 'PUT', body: payload })
      const index = this.users.findIndex(u => u.id === id)
      if (index !== -1) this.users[index] = updated
      return updated
    },
    async deleteUser(id: number) {
      await $fetch(`/api/users/${id}`, { method: 'DELETE' })
      const index = this.users.findIndex(u => u.id === id)
      if (index !== -1) this.users[index].active = false
    }
  }
})
