import { defineStore } from 'pinia'

export interface Notification {
  id: number
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [] as Notification[],
    unreadCount: 0
  }),
  actions: {
    async fetchAll() {
      // Endpoint a crear: GET /api/notifications
      try {
        const data = await $fetch<Notification[]>('/api/notifications')
        this.notifications = data
        this.unreadCount = data.filter(n => !n.isRead).length
      } catch (error) {
        console.error('Error fetching notifications', error)
      }
    },
    // Este método lo llamaremos desde el socket cuando llegue una alerta nueva
    addRealtimeNotification(notification: Notification) {
      if (this.notifications.some(n => n.id === notification.id)) return
      this.notifications.unshift(notification)
      this.unreadCount++
    },
    async markAsRead(id: number) {
      await $fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      const notif = this.notifications.find(n => n.id === id)
      if (notif && !notif.isRead) {
        notif.isRead = true
        this.unreadCount--
      }
    }
  }
})
