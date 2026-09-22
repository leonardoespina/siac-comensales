<template>
  <q-page padding class="bg-grey-1">
    
    <!-- PANTALLA PRINCIPAL: HISTORIAL CRUD -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-weight-bold text-primary">Historial de Despachos Masivos</div>
      <q-btn 
        color="primary" 
        icon="touch_app" 
        label="Nuevo Despacho Masivo" 
        @click="wizard.open" 
      />
    </div>

    <!-- Filtros del Historial -->
    <q-card bordered class="my-card shadow-1 q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="filterDate" label="Fecha" type="date" outlined dense />
        </div>
        <div class="col-12 col-md-3">
          <q-select 
            v-model="filterDependency" 
            :options="dependenciesOptions" 
            label="Dependencia" 
            outlined 
            dense 
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select 
            v-model="filterSubdependency" 
            :options="filteredSubdependenciesOptions" 
            label="Subdependencia" 
            outlined 
            dense 
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-md-2 row justify-end">
          <q-btn color="secondary" icon="refresh" label="Actualizar" @click="fetchHistory" :loading="store.loading" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla Principal (CRUD Lectura) -->
    <q-table
      :rows="store.massiveBatches"
      :columns="columns"
      row-key="id"
      :loading="store.loading"
      flat
      bordered
      class="shadow-1"
    >
      <template v-slot:body-cell-batchCode="props">
        <q-td :props="props">
          <div class="text-weight-bold text-primary">{{ props.row.batchCode || `LOTE-${props.row.id}` }}</div>
        </q-td>
      </template>
      <template v-slot:body-cell-modality="props">
        <q-td :props="props">
          <q-chip color="accent" text-color="white" size="sm" icon="takeout_dining">
            VIANDAS (MASIVO)
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip 
            :color="props.row.isDispatched ? 'positive' : 'warning'" 
            text-color="white" 
            size="sm" 
            :icon="props.row.isDispatched ? 'check_circle' : 'pending'"
          >
            {{ props.row.isDispatched ? 'ENTREGADO' : 'PENDIENTE' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-dispatchedInfo="props">
        <q-td :props="props">
          <div v-if="props.row.isDispatched" class="text-caption text-grey-8">
            <q-icon name="person" size="xs" /> {{ props.row.dispatchedByName }}<br>
            <q-icon name="schedule" size="xs" /> {{ props.row.dispatchedAt }}
            <q-badge v-if="props.row.isSubstitute" color="orange" label="Suplente" class="q-ml-sm" />
          </div>
          <div v-else class="text-caption text-grey-5">
            -- No despachado --
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- COMPONENTE: WIZARD DE DESPACHO MASIVO (DIALOG APARTE) -->
    <q-dialog v-model="wizard.isOpen.value" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-white">
        <q-bar class="bg-primary text-white">
          <q-icon name="takeout_dining" />
          <div class="text-weight-bold">Asistente de Despacho Masivo</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip>Cerrar Asistente</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section class="q-pa-xl">
          <q-stepper v-model="wizard.step.value" color="primary" animated header-nav>
            
            <!-- PASO 1: BÚSQUEDA -->
            <q-step :name="1" title="Buscar Solicitud" icon="search" :done="wizard.step.value > 1">
              <div class="text-h6 q-mb-md">Filtros de Búsqueda de Lote</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-3">
                  <q-select 
                    v-model="wizard.searchDiningRoom.value" 
                    :options="wizard.diningRoomsOptions.value" 
                    label="Comedor" 
                    outlined 
                    emit-value
                    map-options
                  />
                </div>
                <div class="col-12 col-md-2">
                  <q-input
                    v-model="wizard.searchDateFrom.value"
                    label="Fecha Desde"
                    type="date"
                    outlined
                  />
                </div>
                <div class="col-12 col-md-2">
                  <q-input
                    v-model="wizard.searchDateTo.value"
                    label="Fecha Hasta"
                    type="date"
                    outlined
                    :min="wizard.searchDateFrom.value"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-select 
                    v-model="wizard.searchDependency.value" 
                    :options="dependenciesOptions" 
                    label="Dependencia" 
                    outlined 
                    emit-value
                    map-options
                    @update:model-value="wizard.resetSelection"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-select 
                    v-model="wizard.searchSubdependency.value" 
                    :options="wizard.filteredSubdepsOptions.value" 
                    label="Subdependencia" 
                    outlined 
                    emit-value
                    map-options
                  />
                </div>
              </div>
                <q-stepper-navigation class="text-right q-mt-md">
                  <q-btn color="primary" label="Buscar Solicitudes" icon="search" @click="wizard.performSearch" :loading="wizard.isSearching.value" :disable="!wizard.searchDiningRoom.value || !wizard.searchDependency.value || !wizard.searchSubdependency.value" />
                </q-stepper-navigation>
            </q-step>

            <!-- PASO 2: SELECCIÓN DE SERVICIOS -->
            <q-step :name="2" title="Seleccionar Servicios" icon="restaurant_menu" :done="wizard.step.value > 2">
              <div class="text-h6 q-mb-md">Seleccione los servicios a despachar</div>

              <div v-if="wizard.foundBatches.value.length === 0" class="text-center text-grey-7 q-pa-md">
                No se encontraron solicitudes masivas pendientes para este rango de fechas y área.
              </div>

              <template v-else>
                <!-- Agrupar por dateLabel -->
                <div
                  v-for="(group, date) in Object.groupBy(wizard.foundBatches.value, (b) => b.dateLabel)"
                  :key="date"
                  class="q-mb-md"
                >
                  <q-expansion-item
                    :label="`📅 ${date} — ${group.filter(b => !b.isDispatched).length} pendiente(s)`"
                    :caption="`${group.length} lote(s) en total`"
                    default-opened
                    header-class="bg-blue-grey-1 text-primary text-weight-bold rounded-borders"
                  >
                    <q-table
                      :rows="group"
                      :columns="[
                        { name: 'shiftType', label: 'Turno', field: 'shiftType', align: 'left' },
                        { name: 'quantity', label: 'Viandas', field: 'quantity', align: 'center' },
                        { name: 'batchCode', label: 'Código', field: 'batchCode', align: 'left' },
                        { name: 'status', label: 'Estado', field: 'isDispatched', align: 'center' }
                      ]"
                      row-key="id"
                      selection="multiple"
                      v-model:selected="wizard.selectedBatches.value"
                      flat
                      bordered
                      :rows-per-page-options="[0]"
                      hide-bottom
                      class="q-mt-xs"
                    >
                      <template v-slot:body-cell-status="props">
                        <q-td :props="props">
                          <q-chip
                            :color="props.row.isDispatched ? 'positive' : 'warning'"
                            text-color="white"
                            size="sm"
                            :icon="props.row.isDispatched ? 'check_circle' : 'pending'"
                          >
                            {{ props.row.isDispatched ? 'ENTREGADO' : 'PENDIENTE' }}
                          </q-chip>
                        </q-td>
                      </template>
                    </q-table>
                  </q-expansion-item>
                </div>
              </template>

              <div v-if="wizard.selectedBatches.value.length > 0" class="q-mt-md text-positive text-weight-bold">
                <q-icon name="check_circle" /> {{ wizard.selectedBatches.value.length }} lote(s) seleccionado(s) para despachar
              </div>

              <q-stepper-navigation class="q-mt-md row justify-between">
                <q-btn flat color="primary" label="Volver a Buscar" @click="wizard.step.value = 1" />
                <q-btn
                  color="primary"
                  label="Siguiente (Autorizar)"
                  @click="wizard.step.value = 3"
                  :disable="wizard.selectedBatches.value.length === 0"
                />
              </q-stepper-navigation>
            </q-step>

              <!-- PASO 3: AUTENTICACIÓN -->
            <q-step :name="3" title="Autorizar Retiro" icon="fingerprint">
              <div class="text-h6 q-mb-md">Autorizar Retiro de Servicio</div>
              
              <div class="bg-blue-1 q-pa-md rounded-borders q-mb-md" v-if="wizard.selectedBatches.value.length > 0">
                <strong>Servicios a despachar:</strong>
                <q-chip
                  v-for="batch in wizard.selectedBatches.value"
                  :key="batch.id"
                  color="primary"
                  text-color="white"
                  size="sm"
                  class="q-ml-xs"
                >
                  {{ batch.shiftType }} ({{ batch.quantity }} viandas)
                </q-chip>
                <br>
                <strong>Delegado esperado:</strong> {{ wizard.selectedBatches.value[0]?.expectedResponsible }}
              </div>

              <!-- Activación Biométrica Manual -->
              <div 
                class="text-center q-py-md bg-grey-1 rounded-borders q-mb-md cursor-pointer" 
                @click="wizard.startScannerCycle"
              >
                <div class="q-mb-md">
                  <img 
                    v-if="wizard.capturedImage.value" 
                    :src="wizard.capturedImage.value" 
                    alt="Huella" 
                    style="max-width: 120px; border-radius: 8px;"
                  />
                  <q-icon 
                    v-else
                    name="fingerprint" 
                    size="80px" 
                    :color="wizard.isReaderConnected.value ? (wizard.isVerifying.value ? 'primary' : 'positive') : 'grey-5'"
                    :class="{'pulsing-icon': wizard.isVerifying.value}"
                  />
                </div>
                
                <div class="text-h6 text-dark q-mt-md">
                  {{ wizard.isReaderConnected.value ? (wizard.isVerifying.value ? 'Analizando Huella...' : 'Haga clic en la huella para escanear') : 'Lector Desconectado' }}
                </div>
                <div class="text-caption text-grey-7 q-mt-sm">
                  {{ wizard.isReaderConnected.value ? 'El sistema se activará solo una vez' : 'Verifique la conexión USB del sensor U.are.U 5160' }}
                </div>
              </div>
              
              <q-input 
                v-model="wizard.scannedCedula.value" 
                label="Cédula manual (Plan B)" 
                outlined 
                autofocus
                @keyup.enter="() => wizard.handleManualSubmit(fetchHistory)"
              >
                <template v-slot:prepend>
                  <q-icon name="keyboard" color="grey-6" />
                </template>
              </q-input>

              <q-banner v-if="wizard.warningMessage.value" rounded class="bg-warning text-dark q-mt-md">
                <template v-slot:avatar>
                  <q-icon name="warning" />
                </template>
                {{ wizard.warningMessage.value }}
              </q-banner>

              <q-stepper-navigation class="q-mt-xl row justify-between">
                <q-btn flat color="primary" label="Volver" @click="wizard.step.value = 2" />
                <q-btn
                  :color="wizard.forceDispatch.value ? 'warning' : 'positive'"
                  :label="wizard.forceDispatch.value ? `Confirmar y Despachar (${wizard.selectedBatches.value.length} lotes - Forzado)` : `Procesar y Despachar (${wizard.selectedBatches.value.length} lotes)`"
                  @click="() => wizard.processMultiDispatch(fetchHistory)"
                  :loading="wizard.isDispatching.value"
                />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMassiveDispatchStore } from '~/stores/massiveDispatch'
import { useMassiveWizard } from '~/composables/useMassiveWizard'

const store = useMassiveDispatchStore()
const wizard = useMassiveWizard()

// Variables locales (Solo 3 refs permitidos por regla de arquitectura para la tabla)
const filterDate = ref(new Date().toISOString().split('T')[0])
const filterDependency = ref(null)
const filterSubdependency = ref(null)

const dependenciesOptions = computed(() => {
  return store.dependencies.map((d: any) => ({ label: d.name, value: d.id }))
})

const filteredSubdependenciesOptions = computed(() => {
  let allSubdeps: any[] = []
  if (Array.isArray(store.dependencies)) {
    store.dependencies.forEach((d: any) => {
      if (d.subdependencies) allSubdeps = allSubdeps.concat(d.subdependencies)
    })
  }
  if (filterDependency.value) {
    allSubdeps = allSubdeps.filter(s => s.dependencyId === filterDependency.value)
  }
  return allSubdeps.map(s => ({ label: s.name, value: s.id }))
})

watch(filterDependency, () => {
  filterSubdependency.value = null
})

// Columnas de la tabla
const columns = [
  { name: 'batchCode', label: 'Código', field: 'batchCode', align: 'left', sortable: true },
  { name: 'shiftType', label: 'Turno', field: 'shiftType', align: 'left', sortable: true },
  { name: 'subdependencyName', label: 'Destino', field: 'subdependencyName', align: 'left', sortable: true },
  { name: 'quantity', label: 'Cantidad', field: 'quantity', align: 'center', sortable: true },
  { name: 'modality', label: 'Modalidad', field: 'modality', align: 'center' },
  { name: 'expectedResponsible', label: 'Responsable Oficial', field: 'expectedResponsible', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true },
  { name: 'dispatchedInfo', label: 'Información de Entrega', field: 'dispatchedInfo', align: 'left' }
]

function fetchHistory() {
  const params: any = { date: filterDate.value }
  if (filterDependency.value) params.dependencyId = filterDependency.value
  if (filterSubdependency.value) params.subdependencyId = filterSubdependency.value
  store.loadHistory(params)
}

onMounted(() => {
    store.massiveBatches = []
    store.loadCatalogs()
  })
</script>

<style scoped>
.pulsing-icon {
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
}
</style>
