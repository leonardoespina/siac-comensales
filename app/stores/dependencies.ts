import { defineStore } from 'pinia'

export interface DependencyNode {
  id: number
  name: string
  subdependencies?: SubdependencyNode[]
}

export interface SubdependencyNode {
  id: number
  name: string
  dependencyId: number
}

export const useDependenciesStore = defineStore('dependencies', {
  state: () => ({
    dependencies: [] as DependencyNode[],
    isLoading: false,
  }),
  
  actions: {
    async fetchAll() {
      this.isLoading = true
      try {
        const data = await $fetch('/api/dependencies')
        this.dependencies = data as DependencyNode[]
      } catch (error) {
        console.error('Error fetching dependencies:', error)
      } finally {
        this.isLoading = false
      }
    },

    async createDependency(name: string) {
      await $fetch('/api/dependencies', {
        method: 'POST',
        body: { name }
      })
      await this.fetchAll()
    },

    async updateDependency(id: number, name: string) {
      await $fetch(`/api/dependencies/${id}`, {
        method: 'PUT',
        body: { type: 'dependency', name }
      })
      await this.fetchAll()
    },

    async deleteDependency(id: number) {
      await $fetch(`/api/dependencies/${id}?type=dependency`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    },

    async createSubdependency(dependencyId: number, name: string) {
      await $fetch('/api/dependencies', {
        method: 'POST',
        body: { dependencyId, name }
      })
      await this.fetchAll()
    },

    async updateSubdependency(id: number, dependencyId: number, name: string) {
      await $fetch(`/api/dependencies/${id}`, {
        method: 'PUT',
        body: { type: 'subdependency', dependencyId, name }
      })
      await this.fetchAll()
    },

    async deleteSubdependency(id: number) {
      await $fetch(`/api/dependencies/${id}?type=subdependency`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    }
  }
})
