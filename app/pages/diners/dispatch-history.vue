<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const historyData = ref<any[]>([])
const loadingHistory = ref(false)
const diningRoomId = ref<number | null>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])

// Búsqueda
const searchQuery = ref('')

// Dining Rooms
const { data: diningRooms } = useFetch('/api/dining-rooms', {
  transform: (data: any) => data.filter((d: any) => d.active)
})

const fetchHistory = async () => {
  if (!diningRoomId.value) return
  loadingHistory.value = true
  try {
    const res = await $fetch<any[]>('/api/dispatch/history', {
      params: { 
        diningRoomId: diningRoomId.value,
        date: selectedDate.value 
      }
    })
    historyData.value = res
  } catch (err) {
    console.error(err)
  } finally {
    loadingHistory.value = false
  }
}

const onRevertDispatch = async (id: number) => {
  if (!confirm('¿Estás seguro que deseas deshacer este despacho? Esta acción quedará registrada.')) return
  try {
    await $fetch('/api/dispatch/revert', {
      method: 'POST',
      body: { detailId: id }
    })
    await fetchHistory()
  } catch (err: any) {
    alert(err.data?.statusMessage || 'Error al deshacer')
  }
}

const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left' as const, sortable: true },
  { name: 'dinerName', label: 'Comensal', field: 'dinerName', align: 'left' as const, sortable: true },
  { name: 'shiftType', label: 'Turno', field: 'shiftType', align: 'center' as const, sortable: true },
  { name: 'details', label: 'Detalle', field: 'modality', align: 'center' as const },
  { name: 'dispatchedAt', label: 'Fecha y Hora', field: 'dispatchedAt', align: 'center' as const, sortable: true },
  { name: 'type', label: 'Método', field: 'isAssisted', align: 'center' as const },
  { name: 'actions', label: 'Acciones', field: 'id', align: 'right' as const }
]

const pagination = {
  rowsPerPage: 15,
  sortBy: 'dispatchedAt',
  descending: true
}

// Watchers
watch([diningRoomId, selectedDate], () => {
  if (diningRoomId.value) {
    fetchHistory()
  }
})

// Búsqueda Filtrada
const filteredRows = computed(() => {
  if (!searchQuery.value) return historyData.value
  const query = searchQuery.value.toLowerCase()
  return historyData.value.filter(row => 
    row.cedula.toLowerCase().includes(query) || 
    row.dinerName.toLowerCase().includes(query)
  )
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h4 text-weight-bold text-primary">Historial de Despachos</div>
        <div class="text-subtitle1 text-grey-7">Auditoría y control de entregas por comedor</div>
      </div>
      <q-space />
      <div class="row q-gutter-md">
        <q-input
          v-model="selectedDate"
          type="date"
          outlined
          dense
          bg-color="white"
          label="Fecha"
        />
        <q-select
          v-model="diningRoomId"
          :options="diningRooms"
          option-value="id"
          option-label="name"
          emit-value
          map-options
          label="Comedor de Operación"
          outlined
          dense
          bg-color="white"
          style="min-width: 250px"
        />
      </div>
    </div>

    <q-card class="shadow-4 rounded-borders">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        :loading="loadingHistory"
        :pagination="pagination"
        row-key="id"
        flat
        bordered
      >
        <template v-slot:top>
          <q-input
            v-model="searchQuery"
            dense
            outlined
            placeholder="Buscar por cédula o nombre"
            class="q-ml-auto"
            style="min-width: 300px"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </template>

        <!-- No Data -->
        <template v-slot:no-data>
          <div class="full-width row flex-center text-accent q-gutter-sm q-pa-lg">
            <q-icon size="2em" name="inbox" />
            <span>
              {{ diningRoomId ? 'No hay despachos registrados en esta fecha.' : 'Seleccione un comedor para ver el historial.' }}
            </span>
          </div>
        </template>

        <template v-slot:body-cell-details="props">
          <q-td :props="props">
            <q-chip v-if="props.row.quantity > 1 || props.row.modality === 'TAKE_AWAY'" size="sm" color="purple" text-color="white" icon="inventory_2">
              Masivo ({{ props.row.quantity }} unid.)
            </q-chip>
            <q-chip v-else size="sm" color="blue-grey-6" text-color="white" icon="restaurant">
              Individual
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-dispatchedAt="props">
          <q-td :props="props">
            <div class="text-weight-medium">
              {{ new Date(props.row.dispatchedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ new Date(props.row.dispatchedAt).toLocaleDateString('es-VE') }}
            </div>
          </q-td>
        </template>
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <!-- Asistido -->
            <q-chip v-if="props.row.isAssisted" size="sm" color="info" text-color="white" icon="support_agent">
              Asistido
            </q-chip>
            <!-- Huella -->
            <q-chip v-else size="sm" color="positive" text-color="white" icon="fingerprint">
              Automático
            </q-chip>
            
            <q-icon v-if="props.row.isEmergency" name="warning" color="warning" size="xs" class="q-ml-xs">
              <q-tooltip>Emergencia / Sin Planificación</q-tooltip>
            </q-icon>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              v-if="props.row.isAssisted"
              icon="undo"
              color="negative"
              size="sm"
              flat
              round
              @click="onRevertDispatch(props.row.id)"
            >
              <q-tooltip>Deshacer Despacho Asistido</q-tooltip>
            </q-btn>
            <q-icon v-else name="lock" color="grey-4" size="sm">
              <q-tooltip>Despachos automáticos no se pueden revertir desde aquí</q-tooltip>
            </q-icon>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>
