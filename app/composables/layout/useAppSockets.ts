import { useQuasar } from 'quasar'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useDinersStore } from '~/stores/diners'
import { useAuthStore } from '~/stores/auth'

export function useAppSockets() {
  const $q = useQuasar()
  const { $socket } = useNuxtApp() as any
  const notifications = useNotificationsStore()
  const auth = useAuthStore()
  
  // Cola para el debouncer de alertas masivas
  let pendingAlerts: Notification[] = []
  let alertTimeout: any = null

  const initSockets = () => {
    if (!auth.isAuthenticated || !auth.user) return

    // Unirse a las salas del usuario
    $socket.emit('join', { userId: auth.user.id })

    // 1. Escuchar notificaciones en vivo
    $socket.off('notification')
    $socket.on('notification', (newNotif: Notification) => {
      notifications.addRealtimeNotification(newNotif)
      
      const isCritical = newNotif.title.includes('Alerta') || newNotif.title.includes('Crítico')
      
      if (isCritical) {
        pendingAlerts.push(newNotif)
        
        if (alertTimeout) clearTimeout(alertTimeout)
        
        // Ventana de agrupación de 500ms
        alertTimeout = setTimeout(() => {
          if (pendingAlerts.length === 1) {
            $q.notify({
              type: 'negative',
              message: pendingAlerts[0].title,
              caption: pendingAlerts[0].message,
              position: 'top-right',
              timeout: 5000
            })
          } else if (pendingAlerts.length > 1) {
            $q.notify({
              type: 'negative',
              message: `¡Atención! ${pendingAlerts.length} alertas detectadas`,
              caption: 'Se han recibido múltiples notificaciones críticas simultáneamente. Revisa el centro de notificaciones.',
              position: 'top-right',
              timeout: 7000,
              icon: 'warning'
            })
          }
          pendingAlerts = []
        }, 500)
      } else {
        $q.notify({
          type: 'info',
          message: newNotif.title,
          caption: newNotif.message,
          position: 'top-right',
          timeout: 5000
        })
      }
    })

    // 2. Escuchar actualizaciones de comensales en vivo
    $socket.off('diner:sync')
    $socket.on('diner:sync', (payload: { action: 'create' | 'update' | 'delete', diner: any }) => {
      const dinersStore = useDinersStore()
      dinersStore.syncDiner(payload.action, payload.diner)
    })
  }

  return {
    initSockets
  }
}
