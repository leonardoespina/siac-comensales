<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import * as xlsx from 'xlsx' // We assume xlsx is installed, or we can use native CSV export

const loading = ref(false)
const rows = ref<any[]>([])

// Auth context
const authStore = useAuthStore()
const user = computed(() => authStore.user)

// Filters
const filters = ref({
  dateFrom: new Date().toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
  diningRoomId: null,
  shiftType: null,
  status: null,
  dependencyId: user?.value?.dependencyId || null,
  subdependencyId: user?.value?.subdependencyId || null
})

// Search
const searchQuery = ref('')

// Dropdowns (mocked for now, in a real scenario we'd fetch them or use a store)
const { data: diningRooms } = useFetch('/api/dining-rooms', {
  transform: (data: any) => data.filter((d: any) => d.active)
})

const shifts = [
  { label: 'Todas', value: null },
  { label: 'Desayuno', value: 'DESAYUNO' },
  { label: 'Almuerzo', value: 'ALMUERZO' },
  { label: 'Cena', value: 'CENA' },
  { label: 'Sobrecena', value: 'SOBRECENA' }
]

const statuses = [
  { label: 'Todas', value: null },
  { label: 'Por Aprobar', value: 'PENDING' },
  { label: 'Aprobadas', value: 'APPROVED' },
  { label: 'Rechazadas', value: 'REJECTED' },
  { label: 'Despachadas', value: 'DESPACHADAS' }
]

// Table configuration
const columns = [
  { name: 'ticketNo', label: 'NAo Ticket', field: 'ticketNo', align: 'left' as const, sortable: true },
  { name: 'cedula', label: 'CAcdula', field: 'cedula', align: 'left' as const, sortable: true },
  { name: 'fullName', label: 'Nombre', field: 'fullName', align: 'left' as const, sortable: true },
  { name: 'gerencia', label: 'Gerencia', field: 'gerencia', align: 'left' as const, sortable: true },
  { name: 'adscripcion', label: 'AdscripciA3n', field: 'adscripcion', align: 'left' as const, sortable: true },
  { name: 'comedor', label: 'Comedor', field: 'comedor', align: 'center' as const, sortable: true },
  { name: 'servicio', label: 'Servicio', field: 'servicio', align: 'center' as const, sortable: true },
  { name: 'modalidad', label: 'Modalidad', field: 'modalidad', align: 'center' as const },
  { name: 'estatus', label: 'Estatus', field: 'estatus', align: 'center' as const, sortable: true },
  { name: 'fechaDespacho', label: 'Fecha Despacho', field: 'fechaDespacho', align: 'center' as const, sortable: true }
]

const pagination = {
  rowsPerPage: 20
}

const filteredRows = computed(() => {
  if (!searchQuery.value) return rows.value
  const q = searchQuery.value.toLowerCase()
  return rows.value.filter(r => 
    r.cedula.toLowerCase().includes(q) || 
    r.ticketNo.toLowerCase().includes(q) ||
    r.fullName.toLowerCase().includes(q)
  )
})

const summaryCounts = computed(() => {
  const counts = {
    desayuno: 0,
    almuerzo: 0,
    cena: 0,
    sobrecena: 0,
    total: 0
  }
  for (const row of filteredRows.value) {
    const qty = row.quantity || 1
    if (row.servicio === 'DESAYUNO') counts.desayuno += qty
    else if (row.servicio === 'ALMUERZO') counts.almuerzo += qty
    else if (row.servicio === 'CENA') counts.cena += qty
    else if (row.servicio === 'SOBRECENA') counts.sobrecena += qty
    counts.total += qty
  }
  return counts
})

// Methods
const onSearch = async () => {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/reports/master', {
      params: {
        dateFrom: `${filters.value.dateFrom}T00:00:00Z`,
        dateTo: `${filters.value.dateTo}T23:59:59Z`,
        diningRoomId: filters.value.diningRoomId,
        shiftType: filters.value.shiftType,
        status: filters.value.status,
        dependencyId: filters.value.dependencyId,
        subdependencyId: filters.value.subdependencyId
      }
    })
    rows.value = res.data || []
  } catch (err: any) {
    alert('Error cargando el reporte: ' + (err.data?.statusMessage || err.message))
  } finally {
    loading.value = false
  }
}

const onExport = () => {
  if (rows.value.length === 0) return alert('No hay datos para exportar')
  
  const headers = columns.map(c => c.label)
  const excelRows = filteredRows.value.map(r => {
    return columns.map(c => r[c.field] || '')
  })
  
  const wsData = [headers, ...excelRows]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Reporte Maestro')
  xlsx.writeFile(wb, `Reporte_Maestro_${filters.value.dateFrom}.xlsx`)
}

// Initial load
onMounted(() => {
  onSearch()
})
</script>

<template>
  <q-page padding class="bg-grey-2">
    <div class="row items-center q-mb-md">
      <q-icon name="analytics" size="lg" color="primary" class="q-mr-sm" />
      <div>
        <div class="text-h5 text-primary text-weight-bold">Reporte Maestro de Solicitudes</div>
        <div class="text-caption text-grey-7">Consolidado general y Kardex</div>
      </div>
      <q-space />
      <q-btn color="positive" icon="archive" label="Exportar" @click="onExport" :disable="loading || rows.length === 0" />
    </div>

    <!-- Filters Panel -->
    <q-card class="q-mb-md shadow-2">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-3 col-md-2">
            <q-input v-model="filters.dateFrom" type="date" label="Desde" outlined dense bg-color="white" />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-input v-model="filters.dateTo" type="date" label="Hasta" outlined dense bg-color="white" />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-select 
              v-model="filters.diningRoomId" 
              :options="[{id: null, name: 'Todos'}, ...(diningRooms || [])]" 
              option-value="id" 
              option-label="name" 
              emit-value 
              map-options 
              label="Comedor" 
              outlined 
              dense 
              bg-color="white" 
            />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-select 
              v-model="filters.shiftType" 
              :options="shifts" 
              emit-value 
              map-options 
              label="Servicio" 
              outlined 
              dense 
              bg-color="white" 
            />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-select 
              v-model="filters.status" 
              :options="statuses" 
              emit-value 
              map-options 
              label="Estatus" 
              outlined 
              dense 
              bg-color="white" 
            />
          </div>
          <div class="col-12 col-sm-12 col-md-2 text-right">
            <q-btn color="primary" icon="search" label="Buscar" @click="onSearch" :loading="loading" class="full-width" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary Counters (Legacy Match) -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-2">
        <q-card class="bg-amber-3 shadow-2">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-caption text-weight-bold text-grey-8">Desayuno</div>
            <div class="text-h6 text-weight-bold text-dark">{{ summaryCounts.desayuno }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-2">
        <q-card class="bg-light-green-3 shadow-2">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-caption text-weight-bold text-grey-8">Almuerzo</div>
            <div class="text-h6 text-weight-bold text-dark">{{ summaryCounts.almuerzo }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-2">
        <q-card class="bg-cyan-3 shadow-2">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-caption text-weight-bold text-grey-8">Cena</div>
            <div class="text-h6 text-weight-bold text-dark">{{ summaryCounts.cena }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-2">
        <q-card class="bg-deep-purple-3 shadow-2">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-caption text-weight-bold text-grey-8">Sobrecena</div>
            <div class="text-h6 text-weight-bold text-dark">{{ summaryCounts.sobrecena }}</div>
          </q-card-section>
        </q-card>
      </div>
      <q-space />
      <div class="col-12 col-sm-3">
        <q-card class="bg-yellow-13 shadow-2">
          <q-card-section class="q-pa-sm text-center">
            <div class="text-caption text-weight-bold text-dark">TOTAL PLATOS</div>
            <div class="text-h6 text-weight-bold text-dark">{{ summaryCounts.total }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Data Grid -->
    <q-card class="shadow-2">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="pagination"
        flat
        bordered
        dense
        separator="cell"
      >
        <template v-slot:top-right>
          <q-input v-model="searchQuery" borderless dense debounce="300" placeholder="Buscar CAcdula / Ticket">
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </template>
        
        <template v-slot:body-cell-fechaDespacho="props">
          <q-td :props="props">
            <span v-if="props.row.fechaDespacho" class="text-weight-bold text-positive">
              {{ new Date(props.row.fechaDespacho).toLocaleString('es-VE') }}
            </span>
            <span v-else class="text-grey-5">-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-estatus="props">
          <q-td :props="props">
            <q-chip v-if="props.row.estatus === 'DESPACHADO'" size="sm" color="positive" text-color="white">DESPACHADO</q-chip>
            <q-chip v-else-if="props.row.estatus === 'APPROVED'" size="sm" color="info" text-color="white">APROBADO</q-chip>
            <q-chip v-else-if="props.row.estatus === 'PENDING'" size="sm" color="warning" text-color="white">POR APROBAR</q-chip>
            <q-chip v-else-if="props.row.estatus === 'REJECTED'" size="sm" color="negative" text-color="white">RECHAZADO</q-chip>
            <span v-else>{{ props.row.estatus }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-modalidad="props">
          <q-td :props="props">
            <q-chip v-if="props.row.modalidad === 'PARA LLEVAR'" size="sm" color="purple" text-color="white" icon="inventory_2">
              LLEVAR ({{ props.row.quantity }})
            </q-chip>
            <span v-else class="text-grey-8">BANDEJA</span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>
