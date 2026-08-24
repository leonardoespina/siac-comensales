import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

export function useDashboard() {
  const router = useRouter()
  const auth = useAuthStore()

  const loadingMetrics = ref(false)
  const metrics = ref({
    registeredDiners: 0,
    todayRequests: 0,
    todayDispatched: 0
  })

  const canManageDiners = computed(() => {
    return auth.hasPermission('DINERS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead')
  })

  const goTo = (route: string) => {
    router.push(route)
  }

  const fetchMetrics = async () => {
    if (!canManageDiners.value) return
    loadingMetrics.value = true
    try {
      const data = await $fetch('/api/dashboard/metrics')
      metrics.value = data
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      loadingMetrics.value = false
    }
  }

  onMounted(() => {
    fetchMetrics()
  })

  return {
    auth,
    canManageDiners,
    metrics,
    loadingMetrics,
    fetchMetrics,
    goTo
  }
}
