import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

export function useDashboard() {
  const router = useRouter()
  const auth = useAuthStore()

  const canManageDiners = computed(() => {
    // Módulo de Comensales: Si puede leer el directorio de comensales o gestionar peticiones
    return auth.hasPermission('DINERS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead')
  })

  const goTo = (route: string) => {
    router.push(route)
  }

  const initializeDashboard = async () => {
    // Aquí podemos cargar métricas iniciales del dashboard de comensales en el futuro
  }

  onMounted(() => {
    initializeDashboard()
  })

  return {
    auth,
    canManageDiners,
    goTo
  }
}
