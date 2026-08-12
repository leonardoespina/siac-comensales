<template>
  <q-page padding class="bg-grey-1">
    
    <!-- PANTALLA PRINCIPAL: HISTÓRICO DE SOLICITUDES -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-weight-bold text-primary">Historial de Solicitudes</div>
      <q-btn 
        color="primary" 
        icon="add" 
        label="Nueva Solicitud" 
        @click="form.openCreate()" 
        v-if="auth.hasPermission('DINERS_REQUESTS', 'canCreate')"
      />
    </div>

    <!-- Filtros de Búsqueda Histórico -->
    <q-card bordered class="my-card shadow-1 q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="filterStartDate" label="Desde" type="date" outlined dense />
        </div>
        <div class="col-12 col-md-4">
          <q-input v-model="filterEndDate" label="Hasta" type="date" outlined dense />
        </div>
        <div class="col-12 col-md-4 row justify-end">
          <q-btn color="secondary" icon="search" label="Buscar" @click="loadData" :loading="store.loading" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla de Solicitudes Registradas -->
    <q-table
      :rows="store.requests"
      :columns="historyColumns"
      row-key="id"
      :loading="store.loading"
      flat
      bordered
      class="shadow-1"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.status === 'APPROVED' ? 'positive' : 'warning'" text-color="white" size="sm">
            {{ props.row.status }}
          </q-chip>
          <q-chip v-if="props.row.isExtraordinary" color="info" text-color="white" size="sm" icon="star">
            Extraordinaria
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-details="props">
        <q-td :props="props">
          {{ props.row.details?.length || 0 }} comensales
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-sm text-right">
          <!-- Baja / Cancelar -->
          <q-btn 
            flat 
            round 
            color="negative" 
            icon="delete" 
            size="sm" 
            @click="confirmDelete(props.row)"
            v-if="auth.hasPermission('DINERS_REQUESTS', 'canDelete')"
          >
            <q-tooltip>Dar de baja / Cancelar</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- VENTANA MODAL: FORMULARIO LEGACY MAESTRO-DETALLE -->
    <q-dialog v-model="form.isOpen.value" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-grey-1">
        
        <!-- Toolbar del Modal -->
        <q-bar class="bg-primary text-white q-pa-md" style="height: 60px">
          <q-icon name="restaurant_menu" size="sm" />
          <div class="text-h6 text-weight-bold q-ml-sm">Solicitud de Alimentación</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip>Cerrar</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section class="q-pa-md" :style="`height: calc(100vh - 60px - 52px); overflow-y: ${$q.screen.gt.sm ? 'hidden' : 'auto'};`">
          <div class="row q-col-gutter-md" :class="{'full-height': $q.screen.gt.sm}">
            
            <!-- PANEL IZQUIERDO: Gestión de Alimentos -->
            <div class="col-12 col-md-3" :class="{'full-height': $q.screen.gt.sm}" :style="$q.screen.gt.sm ? 'overflow-y: auto;' : ''">
              <q-card bordered class="shadow-2">
                <q-card-section class="bg-grey-3 q-py-xs border-bottom">
                  <div class="text-subtitle2 text-weight-bold">Gestión de Alimentos</div>
                </q-card-section>
                
                <q-card-section class="q-gutter-y-md q-px-md q-py-sm">
                  
                  <div v-if="auth.hasPermission('GLOBAL_ACCESS', 'canRead') || auth.user?.dependencyId">
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Dependencia:</div>
                    <q-select 
                      v-model="form.filters.value.dependencyId" 
                      :options="dependenciesStore.dependencies" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="!auth.hasPermission('GLOBAL_ACCESS', 'canRead') || !!auth.user?.dependencyId"
                      :readonly="!auth.hasPermission('GLOBAL_ACCESS', 'canRead') || !!auth.user?.dependencyId"
                    />
                  </div>
                  
                  <div v-if="!auth.user?.subdependencyId || auth.user?.subdependencyId">
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Subdependencia:</div>
                    <q-select 
                      v-model="form.filters.value.subdependencyId" 
                      :options="filteredSubdependencies" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="!!auth.user?.subdependencyId"
                      :readonly="!!auth.user?.subdependencyId"
                    />
                  </div>
                  
                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Cuadrilla:</div>
                    <q-select 
                      v-model="form.filters.value.squadId" 
                      :options="filteredSquads" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                    />
                  </div>
                  
                  <div class="row q-col-gutter-sm">
                    <div class="col-12">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Rango de Fechas:</div>
                      <q-input 
                        v-model="formDateRangeText" 
                        label="Seleccione el rango" 
                        outlined 
                        dense 
                        bg-color="white"
                        readonly
                      >
                        <template v-slot:append>
                          <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-date 
                                v-model="formDateRangeObj" 
                                range 
                                mask="YYYY-MM-DD"
                                :options="allowedDates"
                              >
                                <div class="row items-center justify-end">
                                  <q-btn v-close-popup label="Cerrar" color="primary" flat />
                                </div>
                              </q-date>
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>

                  <!-- Seleccionar Todos -->
                  <q-card flat bordered class="bg-white">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Seleccionar Todos</div>
                      <div class="row q-col-gutter-xs">
                        <div class="col-6" v-for="shift in activeShifts" :key="shift">
                          <q-checkbox 
                            v-model="masterChecks[shift]" 
                            :label="shift" 
                            dense 
                            size="sm"
                            color="primary"
                            @update:model-value="(val) => form.toggleAll(shift, val)"
                          />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <!-- Tipo de Retiro -->
                  <q-card flat bordered class="bg-white">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Tipo de Retiro</div>
                      <div class="row q-col-gutter-xs">
                        <div class="col-12">
                          <q-checkbox v-model="form.filters.value.isExtraordinary" label="Retiro Mara" dense size="sm" color="primary" />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Comedor:</div>
                    <q-select 
                      v-model="form.filters.value.diningRoomId" 
                      :options="diningRoomsStore.diningRooms" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                    />
                  </div>

                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Observación:</div>
                    <q-input 
                      v-model="form.filters.value.observations" 
                      type="textarea" 
                      outlined 
                      dense 
                      bg-color="white"
                      rows="2" 
                    />
                  </div>

                </q-card-section>

              </q-card>
            </div>

            <!-- PANEL DERECHO: Comensales -->
            <div class="col-12 col-md-9" :class="{'full-height': $q.screen.gt.sm}">
              <q-card bordered class="shadow-2 flex column" :class="{'full-height': $q.screen.gt.sm}">
                <q-card-section class="bg-grey-3 q-py-xs row items-center justify-between border-bottom">
                  <div class="text-subtitle2 text-weight-bold">Comensales</div>
                  <div class="row items-center q-gutter-x-sm">
                    <q-input v-model="tableFilter" dense outlined bg-color="white" placeholder="Buscar por nombre o cédula...">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </div>
                </q-card-section>
                
                <!-- Tabla Grilla -->
                <q-card-section class="q-pa-none col-grow" :style="$q.screen.gt.sm ? 'overflow-y: auto;' : ''">
                  <q-table
                    :rows="form.loadedDiners.value"
                    :columns="gridColumns"
                    :filter="tableFilter"
                    row-key="id"
                    flat
                    dense
                    square
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                    table-header-class="bg-blue-9 text-white"
                    :grid="$q.screen.lt.md"
                  >
                    <!-- Personalización de celdas para los Checkboxes y No. -->
                    <template v-slot:body-cell="props">
                      <q-td :props="props" v-if="activeShifts.includes(props.col.name)">
                        <q-checkbox v-model="form.gridState.value[props.row.id][props.col.name]" dense color="primary" />
                      </q-td>
                      <q-td :props="props" v-else-if="props.col.name === 'nro'">
                        {{ props.rowIndex + 1 }}
                      </q-td>
                      <q-td :props="props" v-else>
                        {{ props.value }}
                      </q-td>
                    </template>
                    
                    <!-- Vista de Tarjetas (Grid) para Móviles -->
                    <template v-slot:item="props">
                      <div class="q-pa-xs col-12 col-sm-6 col-md-4">
                        <q-card bordered flat class="shadow-1">
                          <q-card-section class="q-pa-sm bg-grey-2 border-bottom">
                            <div class="text-subtitle2 text-weight-bold text-primary">{{ props.row.name }}</div>
                            <div class="text-caption text-grey-8">C.I: {{ props.row.cedula }} - Dieta: {{ props.row.rationType }}</div>
                          </q-card-section>
                          <q-card-section class="q-pa-sm row q-col-gutter-xs">
                            <div class="col-6" v-for="shift in activeShifts" :key="shift">
                              <q-checkbox 
                                v-model="form.gridState.value[props.row.id][shift]" 
                                :label="shift" 
                                dense 
                                size="sm" 
                                color="primary" 
                              />
                            </div>
                          </q-card-section>
                        </q-card>
                      </div>
                    </template>
                    
                    <!-- Fila vacía -->
                    <template v-slot:no-data>
                      <div class="full-width row flex-center q-pa-xl text-grey-6">
                        Seleccione una Cuadrilla o agregue comensales por Cédula para comenzar.
                      </div>
                    </template>
                  </q-table>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <!-- Footer Fijo con Botones de Acción -->
        <q-separator />
        <q-card-actions class="bg-grey-2 justify-center q-pa-sm">
          <q-btn icon="check_circle" label="Enviar Solicitud" color="primary" @click="onSubmit" :loading="form.loading.value" class="q-px-md q-mx-xs shadow-2" />
          <q-btn icon="exit_to_app" label="Cerrar" color="negative" outline v-close-popup class="q-px-md q-mx-xs" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useDinerRequestForm } from '~/composables/features/useDinerRequestForm'
import { useDinersStore } from '~/stores/diners'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useMealSchedulesStore } from '~/stores/mealSchedules'
import { useDependenciesStore } from '~/stores/dependencies'
import { useSquadsStore } from '~/stores/squads'
import { useNotifications } from '~/composables/core/useNotifications'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'

const store = useDinerRequestsStore()
const form = useDinerRequestForm()
const dinersStore = useDinersStore()
const diningRoomsStore = useDiningRoomsStore()
const schedulesStore = useMealSchedulesStore()
const dependenciesStore = useDependenciesStore()
const squadsStore = useSquadsStore()
const auth = useAuthStore()
const { notify } = useNotifications()
const $q = useQuasar()

// Función helper para formatear de YYYY-MM-DD a DD/MM/YYYY solo para visualización
const formatToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// ----- ESTADO HISTÓRICO (PANTALLA PRINCIPAL) -----
const filterStartDate = ref(dayjs().format('YYYY-MM-DD'))
const filterEndDate = ref(dayjs().format('YYYY-MM-DD'))

const historyColumns = [
  { name: 'date', label: 'Fecha de Servicio', align: 'left', field: (row: any) => dayjs(row.date).format('DD/MM/YYYY'), sortable: true },
  { name: 'shiftType', label: 'Turno', align: 'left', field: 'shiftType', sortable: true },
  { name: 'diningRoom', label: 'Comedor', align: 'left', field: (row: any) => row.diningRoom?.name || 'N/A' },
  { name: 'status', label: 'Estado', align: 'center', field: 'status' },
  { name: 'details', label: 'Comensales', align: 'center', field: 'details' },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

async function loadData() {
  await store.fetchRequests(filterStartDate.value, filterEndDate.value)
}

function confirmDelete(row: any) {
  $q.dialog({
    title: 'Confirmar Baja',
    message: `¿Está seguro que desea cancelar la solicitud de ${row.shiftType} para el ${dayjs(row.date).format('DD/MM/YYYY')}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteRequest(row.id)
      notify.success('Solicitud cancelada exitosamente')
    } catch (e: any) {
      notify.error(e.data?.statusMessage || 'Error al cancelar. Recuerde la hora límite.')
    }
  })
}

// ----- ESTADO MODAL (FORMULARIO LEGACY) -----
const tableFilter = ref('')
const masterChecks = ref<Record<string, boolean>>({})

// Función para restringir fechas pasadas en el calendario
const allowedDates = (dateStr: string) => {
  return dateStr >= dayjs().format('YYYY/MM/DD')
}

// Objetos para el Date Range Picker del Formulario
const formDateRangeObj = ref<any>({ 
  from: form.filters.value.dateFrom, 
  to: form.filters.value.dateTo 
})
const formDateRangeText = ref(`${formatToDDMMYYYY(form.filters.value.dateFrom)} hasta ${formatToDDMMYYYY(form.filters.value.dateTo)}`)

watch(formDateRangeObj, (newVal) => {
  if (newVal && newVal.from && newVal.to) {
    form.filters.value.dateFrom = newVal.from
    form.filters.value.dateTo = newVal.to
    formDateRangeText.value = `${formatToDDMMYYYY(newVal.from)} hasta ${formatToDDMMYYYY(newVal.to)}`
  } else if (newVal && typeof newVal === 'string') {
    form.filters.value.dateFrom = newVal
    form.filters.value.dateTo = newVal
    formDateRangeText.value = formatToDDMMYYYY(newVal)
  } else {
    formDateRangeText.value = ''
  }
})

// Mapeo dinámico de turnos activos (Ej: ['DESAYUNO', 'ALMUERZO', 'CENA', 'SOBRECENA'])
const activeShifts = computed(() => {
  return schedulesStore.schedules.filter(s => s.active).map(s => s.shiftType)
})

// Columnas de la tabla grilla
const gridColumns = computed(() => {
  const baseCols = [
    { name: 'nro', label: 'No.', align: 'left', field: 'id', style: 'width: 50px' },
    { name: 'cedula', label: 'Cédula', align: 'left', field: 'cedula' },
    { name: 'nombre', label: 'Nombre', align: 'left', field: 'name' },
    { name: 'rationType', label: 'Dieta', align: 'left', field: 'rationType' },
    { name: 'comedor', label: 'Comedor', align: 'left', field: () => form.filters.value.diningRoomId ? diningRoomsStore.diningRooms.find(d => d.id === form.filters.value.diningRoomId)?.name : 'N/A' }
  ]
  
  // Agregar una columna dinámica por cada turno que exista en el catálogo de Horarios
  const shiftCols = activeShifts.value.map(shift => ({
    name: shift,
    label: shift.charAt(0) + shift.slice(1).toLowerCase(), // Capitalize
    align: 'center',
    field: shift
  }))

  return [...baseCols, ...shiftCols] as any[]
})

// Filtro Inteligente de Cuadrillas (Solo muestra las que tienen comensales en el área seleccionada)
const filteredSquads = computed(() => {
  let availableDiners = dinersStore.diners
  
  if (form.filters.value.subdependencyId) {
    availableDiners = availableDiners.filter(d => d.subdependencyId === form.filters.value.subdependencyId)
  } else if (form.filters.value.dependencyId) {
    availableDiners = availableDiners.filter(d => d.dependencyId === form.filters.value.dependencyId)
  }

  const activeSquadIds = new Set(availableDiners.map(d => d.squadId).filter(id => id != null))
  
  return squadsStore.squads.filter(squad => activeSquadIds.has(squad.id))
})

const filteredSubdependencies = computed(() => {
  const targetDepId = form.filters.value.dependencyId || auth.user?.dependencyId
  if (!targetDepId) return []
  const dep = dependenciesStore.dependencies.find(d => d.id === targetDepId)
  return dep?.subdependencies || []
})

watch(() => form.filters.value.dependencyId, () => {
  form.filters.value.subdependencyId = null
})

onMounted(async () => {
  loadData()
  await Promise.all([
    dependenciesStore.fetchAll(),
    squadsStore.fetchAll(),
    diningRoomsStore.fetchAll(),
    schedulesStore.fetchSchedules(),
    dinersStore.fetchAll()
  ])
  resetMasterChecks()
})

// Cargar la grilla automáticamente al seleccionar una Cuadrilla o Subdependencia
watch([() => form.filters.value.subdependencyId, () => form.filters.value.squadId], ([newSubd, newSquad]) => {
  if (!newSubd && !newSquad) {
    form.loadedDiners.value = []
    return
  }

  let filtered = dinersStore.diners

  if (newSubd) {
    filtered = filtered.filter(d => d.subdependencyId === newSubd)
  }

  if (newSquad) {
    filtered = filtered.filter(d => d.squadId === newSquad)
  }

  form.loadedDiners.value = [...filtered]
  form.initGridStateForDiners(form.loadedDiners.value, activeShifts.value)
  resetMasterChecks()
})

function resetMasterChecks() {
  for (const shift of activeShifts.value) {
    masterChecks.value[shift] = false
  }
}

async function onSubmit() {
  await form.submit(activeShifts.value)
  if (!form.loading.value) {
    // Si terminó exitosamente, recargamos la tabla principal y cerramos el modal
    loadData()
    form.isOpen.value = false
  }
}
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
