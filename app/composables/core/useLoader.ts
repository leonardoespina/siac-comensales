import { useQuasar } from 'quasar'

/**
 * Composable global para invocar la pantalla de carga (Loader) en toda la app.
 * Útil para acciones globales o llamadas a API pesadas donde bloquear la UI es necesario.
 */
export function useLoader() {
  const $q = useQuasar()

  const loader = {
    show: (message = 'Procesando...') => {
      $q.loading.show({
        message,
        spinnerColor: 'primary',
        messageColor: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        customClass: 'text-weight-bold'
      })
    },
    hide: () => {
      $q.loading.hide()
    }
  }

  return { loader }
}
