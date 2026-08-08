import { defineStore } from 'pinia'

export const useRolesStore = defineStore('roles', {
  state: () => ({
    roles: [] as any[],
    modules: [] as any[]
  }),
  actions: {
    async fetchRoles() {
      this.roles = await $fetch<any[]>('/api/roles')
      return this.roles
    },
    async fetchModules() {
      this.modules = await $fetch<any[]>('/api/modules')
      return this.modules
    },
    async createRole(payload: any) {
      const newRole = await $fetch('/api/roles', { method: 'POST', body: payload })
      this.roles.push(newRole)
      return newRole
    },
    async updateRole(id: number, payload: any) {
      const updated = await $fetch(`/api/roles/${id}`, { method: 'PUT', body: payload })
      const index = this.roles.findIndex(r => r.id === id)
      if (index !== -1) this.roles[index] = updated
      return updated
    },
    async deleteRole(id: number) {
      await $fetch(`/api/roles/${id}`, { method: 'DELETE' })
      this.roles = this.roles.filter(r => r.id !== id)
    }
  }
})
