import { defineStore } from 'pinia'

export interface Diner {
  id: number
  cedula: string
  name: string
  rationType: string
  active: boolean
  squadId: number
  positionId?: number | null
  diningRoomId?: number | null
}

export const useDinersStore = defineStore('diners', {
  state: () => ({
    diners: [] as Diner[],
    isLoading: false,
  }),
  
  actions: {
    async fetchAll(params?: { subdependencyId?: number | null, dependencyId?: number | null }) {
      this.isLoading = true
      try {
        const query = new URLSearchParams()
        if (params?.subdependencyId) query.append('subdependencyId', params.subdependencyId.toString())
        if (params?.dependencyId) query.append('dependencyId', params.dependencyId.toString())
        
        const url = query.toString() ? `/api/diners?${query.toString()}` : '/api/diners'
        const data = await $fetch(url)
        this.diners = data as Diner[]
      } catch (error) {
        console.error('Error fetching diners:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async registerDiner(cedula: string, name: string, rationType: string, squadId: number, subdependencyId?: number | null, positionId?: number | null, diningRoomId?: number | null) {
      this.isLoading = true
      try {
        const result = await $fetch('/api/diners', {
          method: 'POST',
          body: { cedula, name, rationType, squadId, subdependencyId, positionId, diningRoomId }
        })
        
        // Usar syncDiner para evitar duplicados si el WebSocket llegó primero
        this.syncDiner('create', result)
        
        return result
      } finally {
        this.isLoading = false
      }
    },
    
    async updateDiner(id: number, data: { cedula: string, name: string, rationType: string, squadId: number, subdependencyId?: number | null, positionId?: number | null, diningRoomId?: number | null }) {
      this.isLoading = true
      try {
        const result = await $fetch(`/api/diners/${id}`, {
          method: 'PUT',
          body: data
        })
        const index = this.diners.findIndex(d => d.id === id)
        if (index !== -1) {
          this.diners[index] = { ...this.diners[index], ...result as Diner }
        }
        return result
      } finally {
        this.isLoading = false
      }
    },

    async deleteDiner(id: number) {
      this.isLoading = true
      try {
        await $fetch(`/api/diners/${id}`, {
          method: 'DELETE'
        })
        this.diners = this.diners.filter(d => d.id !== id)
      } finally {
        this.isLoading = false
      }
    },

    async fetchByCedula(cedula: string) {
      this.isLoading = true
      try {
        const data = await $fetch(`/api/diners/cedula/${cedula}`)
        return data as Diner
      } finally {
        this.isLoading = false
      }
    },

    async clearFingerprint(id: number) {
      this.isLoading = true
      try {
        await $fetch(`/api/diners/${id}/biometric`, {
          method: 'DELETE'
        })
        const index = this.diners.findIndex(d => d.id === id)
        if (index !== -1) {
          (this.diners[index] as any).biometricRecord = null
        }
      } finally {
        this.isLoading = false
      }
    },
    
    async saveBiometricTemplates(dinerId: number, templates: string[]) {
      this.isLoading = true
      try {
        const result = await $fetch(`/api/diners/${dinerId}/biometric`, {
          method: 'PUT',
          body: { templates }
        })
        return result
      } finally {
        this.isLoading = false
      }
    },

    async fetchBiometricTemplates(dinerId: number) {
      this.isLoading = true
      try {
        const result = await $fetch<any>(`/api/diners/${dinerId}/biometric`)
        return result?.templates || []
      } finally {
        this.isLoading = false
      }
    },

    async fetchAllBiometrics() {
      this.isLoading = true
      try {
        return await $fetch<any[]>('/api/diners/biometric/all')
      } finally {
        this.isLoading = false
      }
    },

    async bulkMigrate(dinerIds: number[], targetDiningRoomId: number) {
      this.isLoading = true
      try {
        const result = await $fetch('/api/diners/bulk-migrate', {
          method: 'PUT',
          body: { dinerIds, targetDiningRoomId }
        })
        // Recargar la tabla local para reflejar los cambios
        await this.fetchAll()
        return result
      } finally {
        this.isLoading = false
      }
    },

    async submitRequest(targetDate: string, shiftType: string, dinersList: any[]) {
      this.isLoading = true
      try {
        return await $fetch('/api/diners/requests', {
          method: 'POST',
          body: { targetDate, shiftType, dinersList }
        })
      } finally {
        this.isLoading = false
      }
    },
    
    syncDiner(action: 'create' | 'update' | 'delete', payloadDiner: any) {
      if (action === 'create') {
        // Solo agregar si no existe ya
        if (!this.diners.some(d => d.id === payloadDiner.id)) {
          this.diners.push(payloadDiner as Diner)
        }
      } else if (action === 'update') {
        const index = this.diners.findIndex(d => d.id === payloadDiner.id)
        if (index !== -1) {
          this.diners[index] = { ...this.diners[index], ...payloadDiner }
        }
      } else if (action === 'delete') {
        this.diners = this.diners.filter(d => d.id !== payloadDiner.id)
      }
    }
  }
})
