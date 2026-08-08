import { defineStore } from 'pinia'

export const useAuditStore = defineStore('audit', {
  state: () => ({
    logs: [] as any[],
    meta: { total: 0, page: 1, limit: 50, totalPages: 0 }
  }),
  actions: {
    async fetchLogs(page = 1, limit = 50) {
      const response: any = await $fetch(`/api/audit?page=${page}&limit=${limit}`)
      this.logs = response.data
      this.meta = response.meta
      return response
    }
  }
})
