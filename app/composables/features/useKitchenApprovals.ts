import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'

export function useKitchenApprovals() {
  const $q = useQuasar()
  const loading = ref(true)
  const processing = ref(false)
  const pendingConsumptions = ref<any[]>([])

  const fetchPending = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/consumptions?status=PENDING') as any[]
      // SOLO mostrar Apoyos Institucionales en la bandeja de aprobaciones global
      pendingConsumptions.value = data.filter(tx => tx.type === 'SUPPORT')
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al cargar consumos pendientes' })
    } finally {
      loading.value = false
    }
  }

  const approve = async (id: number) => {
    $q.dialog({
      title: 'Aprobar Consumo',
      message: '¿Estás seguro de aprobar este reporte? El inventario será descontado inmediatamente de la cocina.',
      cancel: true
    }).onOk(async () => {
      processing.value = true
      try {
        await $fetch(`/api/transfers/${id}/status`, {
          method: 'PUT',
          body: { status: 'CONFIRMED', notes: 'Aprobado por Gerencia' }
        })
        $q.notify({ type: 'positive', message: 'Consumo aprobado y stock descontado' })
        await fetchPending()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al aprobar' })
      } finally {
        processing.value = false
      }
    })
  }

  const reject = async (id: number) => {
    $q.dialog({
      title: 'Rechazar Consumo',
      message: 'Indica el motivo del rechazo (opcional):',
      prompt: { model: '', type: 'text' },
      cancel: true
    }).onOk(async (notes) => {
      processing.value = true
      try {
        await $fetch(`/api/transfers/${id}/status`, {
          method: 'PUT',
          body: { status: 'REJECTED', notes: notes || 'Rechazado por Gerencia' }
        })
        $q.notify({ type: 'positive', message: 'Consumo rechazado. El stock no ha sido afectado.' })
        await fetchPending()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al rechazar' })
      } finally {
        processing.value = false
      }
    })
  }

  onMounted(() => fetchPending())

  return { loading, processing, pendingConsumptions, approve, reject }
}
