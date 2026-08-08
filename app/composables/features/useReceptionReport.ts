import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

export interface ReceptionDetail {
  id: number
  productId: number
  quantity: number
  expectedQuantity?: number
  discrepancyReason?: string
  unitPrice: number
  expirationDate?: string
  product?: {
    code: string
    name: string
    unit?: {
      abbreviation: string
    }
  }
}

export interface ReceptionTransaction {
  id: number
  createdAt: string
  status: string
  referenceNumber?: string
  notes?: string
  destination?: {
    name: string
  }
  supplier?: {
    name: string
  }
  createdBy?: {
    name: string
  }
  approvedBy?: {
    name: string
  }
  details: ReceptionDetail[]
}

export function useReceptionReport() {
  const route = useRoute()
  const $q = useQuasar()

  const id = route.params.id as string
  const transaction = ref<ReceptionTransaction | null>(null)
  const loading = ref(true)

  const fetchDetails = async () => {
    loading.value = true
    try {
      const data = await $fetch<ReceptionTransaction>(`/api/receptions/${id}`)
      transaction.value = data
    } catch (error) {
      $q.notify({ 
        type: 'negative', 
        message: 'No se pudo cargar la recepción para el informe' 
      })
    } finally {
      loading.value = false
    }
  }

  const closeTab = () => {
    window.close()
  }

  const hasDiscrepancies = computed(() => {
    if (!transaction.value?.details) return false
    return transaction.value.details.some(d => Number(d.quantity) < Number(d.expectedQuantity || d.quantity))
  })

  const totalExpected = computed(() => {
    if (!transaction.value?.details) return 0
    return transaction.value.details.reduce((acc, d) => acc + Number(d.expectedQuantity || d.quantity), 0)
  })

  const totalReceived = computed(() => {
    if (!transaction.value?.details) return 0
    return transaction.value.details.reduce((acc, d) => acc + Number(d.quantity), 0)
  })

  const totalsByUnit = computed(() => {
    if (!transaction.value?.details) return []
    const totals: Record<string, { expected: number; received: number; difference: number }> = {}

    for (const d of transaction.value.details) {
      const unit = d.product?.unit?.abbreviation || 'UN'
      if (!totals[unit]) {
        totals[unit] = { expected: 0, received: 0, difference: 0 }
      }
      const expected = Number(d.expectedQuantity || d.quantity)
      const received = Number(d.quantity)
      
      totals[unit].expected += expected
      totals[unit].received += received
      // Calculamos mermas como Esperado - Recibido
      totals[unit].difference += (expected - received)
    }

    // Convertimos el objeto en array
    return Object.entries(totals).map(([unit, data]) => ({
      unit,
      ...data
    }))
  })

  onMounted(() => {
    fetchDetails()
  })

  return {
    transaction,
    loading,
    hasDiscrepancies,
    totalExpected,
    totalReceived,
    totalsByUnit,
    closeTab
  }
}
