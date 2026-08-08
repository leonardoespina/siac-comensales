import { useQuasar } from 'quasar'

/**
 * Composable global para emitir notificaciones estandarizadas en toda la app.
 * Reemplaza los mensajes de error locales dentro de los componentes.
 */
export function useNotifications() {
  const $q = useQuasar()

  const notify = {
    success: (message: string) => $q.notify({
      type: 'positive',
      message,
      timeout: 3000,
      icon: 'check_circle',
      classes: 'text-weight-medium'
    }),
    error: (message: string) => $q.notify({
      type: 'negative',
      message,
      timeout: 6000,
      icon: 'error',
      classes: 'text-weight-medium'
    }),
    warning: (message: string) => $q.notify({
      type: 'warning',
      message,
      icon: 'warning',
      classes: 'text-weight-medium text-dark'
    }),
    info: (message: string) => $q.notify({
      type: 'info',
      message,
      icon: 'info',
      classes: 'text-weight-medium'
    }),
  }

  return { notify }
}
