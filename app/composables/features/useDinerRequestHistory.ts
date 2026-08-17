import { ref } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useNotifications } from '~/composables/core/useNotifications'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { computed } from 'vue'

export function useDinerRequestHistory() {
  const store = useDinerRequestsStore()
  const { notify } = useNotifications()
  const $q = useQuasar()

  const filterStartDate = ref(dayjs().format('YYYY-MM-DD'))
  const filterEndDate = ref(dayjs().add(1, 'day').format('YYYY-MM-DD'))

  const historyColumns = [
    { name: 'batchCode', label: 'Lote / Solicitud', align: 'left', field: 'id', sortable: true },
    { name: 'date', label: 'Fechas', align: 'left', field: (row: any) => {
      const dates = Array.from(new Set(row.originalRequests.map((r: any) => formatDate(r.date))))
      
      // Si son más de 2 días, mostramos un resumen inteligente (Rango)
      if (dates.length > 2) {
        // Ordenamos para asegurarnos que tomamos el primero y el último correctos
        const sortedDates = [...dates].sort((a: any, b: any) => {
          const [d1, m1, y1] = a.split('/')
          const [d2, m2, y2] = b.split('/')
          return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime()
        })
        return `${sortedDates[0]} al ${sortedDates[sortedDates.length - 1]} (${dates.length} días)`
      }
      
      return dates.join(', ')
    }, sortable: true },
    { name: 'shiftType', label: 'Turnos', align: 'left', field: (row: any) => row.shiftTypes.join(', ') },
    { name: 'diningRoom', label: 'Comedor', align: 'left', field: 'diningRoom' },
    { name: 'status', label: 'Estado', align: 'center', field: 'status' },
    { name: 'details', label: 'Total Platos', align: 'center', field: 'totalDiners' },
    { name: 'actions', label: 'Acciones', align: 'right' }
  ]

  const groupedRequests = computed(() => {
    const groups: Record<string, any> = {}
    
    store.requests.forEach(req => {
      const key = req.batchCode || `SINGLE-${req.id}`
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: req.date,
          shiftTypes: [],
          diningRoom: req.diningRoom?.name || 'N/A',
          status: req.status,
          isDeleted: false,
          totalDiners: 0,
          rawIds: [],
          originalRequests: []
        }
      }
      
      groups[key].originalRequests.push(req)
      groups[key].rawIds.push(req.id)
    })

    const finalGroups = Object.values(groups)

    finalGroups.forEach((group: any) => {
      const activeReqs = group.originalRequests.filter((r: any) => r.deletedAt === null)
      group.isDeleted = activeReqs.length === 0
      
      // La fuente de la verdad para total y turnos son las peticiones vivas.
      // Si el lote está completamente eliminado, usamos el historial para mostrar qué contenía antes de morir.
      const sourceReqs = group.isDeleted ? group.originalRequests : activeReqs
      
      group.shiftTypes = Array.from(new Set(sourceReqs.map((r: any) => r.shiftType)))
      group.totalDiners = sourceReqs.reduce((sum: number, r: any) => {
        return sum + (r.details?.reduce((acc: number, d: any) => acc + (d.quantity || 1), 0) || 0)
      }, 0)

      if (group.isDeleted) {
        group.status = 'DELETED'
      } else {
        group.status = activeReqs[0].status
      }
    })

    return finalGroups.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  async function loadData() {
    await store.fetchRequests(filterStartDate.value, filterEndDate.value)
  }

  function confirmDelete(row: any) {
    $q.dialog({
      title: 'Confirmar Baja de Lote',
      message: `¿Está seguro que desea cancelar TODA la solicitud de lote para ${row.shiftTypes.join(', ')}? Esta acción cancelará ${row.originalRequests.length} peticiones.`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.deleteRequestsBulk(row.rawIds)
        notify.success('Lote de solicitudes cancelado exitosamente')
      } catch (e: any) {
        notify.error(e.data?.statusMessage || 'Error al cancelar. Recuerde la hora límite.')
      }
    })
  }

  function formatDate(d: any) {
    // Si la fecha viene del backend como ISO String (ej. 2026-08-17T00:00:00.000Z), extraemos solo la parte YYYY-MM-DD
    // para evitar que el ajuste de zona horaria local lo mueva al día anterior.
    const dateStr = typeof d === 'string' ? d : d.toISOString()
    const safeDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    return dayjs(safeDate).format('DD/MM/YYYY')
  }

  return {
    filterStartDate,
    filterEndDate,
    historyColumns,
    groupedRequests,
    loadData,
    confirmDelete,
    formatDate
  }
}
