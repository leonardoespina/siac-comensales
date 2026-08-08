import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

export function useReceptionsList() {
  const router = useRouter()
  const $q = useQuasar()

  const receptions = ref([])
  const loading = ref(false)

  const columns = [
    { name: 'id', label: 'Nº Operación', field: 'id', align: 'left' },
    { name: 'supplier', label: 'Proveedor', field: (row: any) => row.supplier?.name || 'N/A', align: 'left' },
    { name: 'destination', label: 'Almacén Destino', field: (row: any) => row.destination?.name || 'N/A', align: 'left' },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' },
    { name: 'date', label: 'Fecha', field: 'createdAt', align: 'right', format: (val: string) => new Date(val).toLocaleDateString() },
    { name: 'actions', label: 'Acciones', align: 'right' }
  ]

  const fetchReceptions = async () => {
    loading.value = true
    try {
      receptions.value = await $fetch('/api/receptions')
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al cargar recepciones' })
    } finally {
      loading.value = false
    }
  }

  const viewDetails = (id: number) => {
    router.push(`/inventory/receptions/${id}`)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'grey-7',
      PENDING: 'orange-8',
      APPROVED: 'blue-8',
      REJECTED: 'red-8',
      CONFIRMED: 'green-8'
    }
    return colors[status] || 'grey'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      CONFIRMED: 'Confirmado'
    }
    return labels[status] || status
  }

  const { $socket } = useNuxtApp() as any

  onMounted(() => {
    fetchReceptions()

    // Sincronización en tiempo real con WebSockets
    $socket.on('transaction:sync', (payload: any) => {
      const tx = payload.transaction
      // Filtrar si es RECEPTION
      if (tx.type !== 'RECEPTION') return
      
      const index = receptions.value.findIndex((t: any) => t.id === tx.id)
      if (index !== -1) {
        if (payload.action === 'update') {
          // Usar splice para forzar la reactividad en la tabla de Quasar
          receptions.value.splice(index, 1, tx as never)
        } else if (payload.action === 'delete') {
          receptions.value.splice(index, 1)
        }
      } else if (payload.action === 'create') {
        // Añadir a la tabla si no estaba
        receptions.value.unshift(tx as never)
      }
    })
  })

  return {
    receptions,
    loading,
    columns,
    viewDetails,
    getStatusColor,
    getStatusLabel
  }
}
