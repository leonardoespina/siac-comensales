import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'

export function useReceptionDetails() {
  const route = useRoute()
  const router = useRouter()
  const $q = useQuasar()
  const auth = useAuthStore()

  const id = route.params.id
  const transaction = ref<any>(null)
  const loading = ref(true)
  const saving = ref(false)
  const isEditing = ref(false)

  // Filtro de la tabla
  const searchQuery = ref('')

  const canApprove = computed(() => {
    return auth.hasPermission('APPROVAL_RECEPTIONS', 'canUpdate') || auth.hasPermission('GLOBAL_ACCESS', 'canRead')
  })

  const grandTotal = computed(() => {
    if (!transaction.value?.details) return 0
    return transaction.value.details.reduce((total: number, row: any) => {
      return total + (Number(row.quantity) * Number(row.unitPrice))
    }, 0)
  })

  const columns = computed(() => {
    const cols = [
      { name: 'code', label: 'Código', field: (row: any) => row.product?.code, align: 'left' as const },
      { name: 'product', label: 'Producto', field: (row: any) => row.product?.name, align: 'left' as const },
      { name: 'unit', label: 'Unidad', field: (row: any) => row.product?.unit?.abbreviation || 'N/A', align: 'center' as const },
      { name: 'expectedQuantity', label: 'Facturado', field: 'expectedQuantity', align: 'center' as const },
      { name: 'quantity', label: 'Recibido', field: 'quantity', align: 'center' as const },
      { name: 'price', label: 'Precio', field: 'unitPrice', align: 'center' as const, format: (val: number) => `$${val}` },
      { 
        name: 'projectedWac', 
        label: 'Promedio Proyectado', 
        field: (row: any) => {
          if (row.product?.totalStock !== undefined) {
             const prevStock = Number(row.product.totalStock) || 0
             const currentAvg = Number(row.product.referencePrice) || 0
             const incomingQty = Number(row.quantity) || 0
             const incomingPrice = Number(row.unitPrice) || 0
             
             if (prevStock === 0 && incomingQty === 0) return currentAvg
             if (prevStock === 0) return incomingPrice
             
             const divisor = prevStock + incomingQty
             if (divisor === 0) return currentAvg // Evitar división por cero
             
             return ((prevStock * currentAvg) + (incomingQty * incomingPrice)) / divisor
          }
          return Number(row.product?.referencePrice) || 0
        }, 
        align: 'center' as const 
      },
      { name: 'exp', label: 'Vencimiento', field: 'expirationDate', align: 'center' as const, format: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A' },
      { name: 'total', label: 'Total', field: (row: any) => Number(row.quantity) * Number(row.unitPrice), align: 'center' as const, format: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
    ]
    if (isEditing.value) {
      cols.push({ name: 'actions', label: '', field: 'actions', align: 'center' as const, format: () => '' })
    }
    return cols
  })

  const addProductRow = () => {
    transaction.value.details.push({
      id: 0,
      transactionId: transaction.value.id,
      productId: null,
      isNew: true, // Flag para la UI y Backend
      product: { code: '', name: '', unitText: '' },
      expectedQuantity: 0,
      quantity: 1,
      unitPrice: 0,
      expirationDate: null
    })
    $q.notify({ type: 'positive', message: 'Fila en blanco añadida' })
  }

  const fetchDetails = async () => {
    try {
      const data = await $fetch(`/api/receptions/${id}`)
      transaction.value = data
    } catch (error) {
      $q.notify({ type: 'negative', message: 'No se pudo cargar la recepción' })
    } finally {
      loading.value = false
    }
  }

  const updateStatus = async (status: string, notes?: string) => {
    let message = '¿Estás seguro de avanzar la transacción?'
    if (status === 'PENDING') message = '¿Enviar a aprobación gerencial?'
    if (status === 'APPROVED') message = '¿Aprobar esta recepción?'
    if (status === 'CONFIRMED') message = '¿Confirmar recepción? ESTO ACTUALIZARÁ EL STOCK FÍSICO Y ES IRREVERSIBLE.'

    $q.dialog({ title: 'Confirmar Acción', message, cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/receptions/${id}/status`, {
          method: 'PUT',
          body: { status, notes }
        })
        $q.notify({ type: 'positive', message: 'Estado actualizado correctamente' })
        await fetchDetails()
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al actualizar' })
      } finally {
        saving.value = false
      }
    })
  }

  const deleteDraft = () => {
    $q.dialog({ title: 'Eliminar Borrador', message: '¿Estás seguro de eliminar completamente esta recepción y todos sus productos? Esta acción es irreversible.', color: 'negative', cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/receptions/${id}`, { method: 'DELETE' })
        $q.notify({ type: 'positive', message: 'Borrador eliminado' })
        router.push('/inventory/receptions')
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar borrador' })
      } finally {
        saving.value = false
      }
    })
  }

  const removeRow = (index: number) => {
    transaction.value.details.splice(index, 1)
  }

  const saveDraftChanges = async () => {
    saving.value = true
    try {
      // Se eliminó la validación obligatoria del "Motivo de Faltante"
      // para mejorar la experiencia de usuario (UX) en la recepción física.

      const updatedDetails = transaction.value.details.map((d: any) => ({
        productId: d.productId,
        isNew: d.isNew,
        product: d.product,
        quantity: Number(d.quantity),
        expectedQuantity: Number(d.expectedQuantity || d.quantity),
        unitPrice: Number(d.unitPrice),
        expirationDate: d.expirationDate
      }))
      
      const res = await $fetch(`/api/receptions/${id}`, {
        method: 'PUT',
        body: { details: updatedDetails }
      })
      
      transaction.value = res
      isEditing.value = false
      $q.notify({ type: 'positive', message: 'Cambios guardados con éxito' })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar cambios' })
    } finally {
      saving.value = false
    }
  }

  const promptReject = () => {
    $q.dialog({
      title: 'Rechazar Recepción',
      message: 'Indica el motivo del rechazo:',
      prompt: { model: '', type: 'text', isValid: (val: string) => val.length > 3 },
      cancel: true
    }).onOk((notes) => {
      updateStatus('REJECTED', notes)
    })
  }

  const promptCancel = () => {
    $q.dialog({
      title: 'Anular Recepción',
      message: 'Indica el motivo de la anulación (Obligatorio para auditoría):',
      prompt: { model: '', type: 'text', isValid: (val: string) => val.length > 5 },
      cancel: true
    }).onOk((notes) => {
      updateStatus('CANCELED', notes)
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'grey-7', PENDING: 'orange-8', APPROVED: 'blue-8', REJECTED: 'red-8', CONFIRMED: 'green-8', CANCELED: 'red-10'
    }
    return colors[status] || 'grey'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador', PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado', CONFIRMED: 'Confirmado', CANCELED: 'Anulado'
    }
    return labels[status] || status
  }

  const { $socket } = useNuxtApp() as any

  onMounted(() => {
    fetchDetails()

    // Escuchar Sockets en tiempo real para actualizar el estado sin recargar la página
    if ($socket) {
      $socket.on('transaction:sync', (payload: any) => {
        const tx = payload.transaction
        if (tx && Number(tx.id) === Number(id)) {
          // Reemplazar la data actual con la fresca del Socket
          transaction.value = tx
        }
      })
    }
  })

  return {
    transaction,
    loading,
    saving,
    canApprove,
    isEditing,
    grandTotal,
    columns,
    updateStatus,
    promptReject,
    promptCancel,
    deleteDraft,
    removeRow,
    addProductRow,
    saveDraftChanges,
    getStatusColor,
    getStatusLabel,
    searchQuery
  }
}
