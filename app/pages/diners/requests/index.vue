<template>
  <q-page padding class="bg-grey-1">
    
    <!-- PANTALLA PRINCIPAL: HISTÓRICO DE SOLICITUDES -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-weight-bold text-primary">Historial de Solicitudes</div>
      <q-btn 
        color="primary" 
        icon="add" 
        label="Nueva Solicitud" 
        @click="formModal?.openCreate()" 
        v-if="auth.hasPermission('DINERS_REQUESTS', 'canCreate')"
      />
    </div>

    <!-- Filtros de Búsqueda Histórico -->
    <q-card bordered class="my-card shadow-1 q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="history.filterStartDate.value" label="Desde" type="date" outlined dense />
        </div>
        <div class="col-12 col-md-4">
          <q-input v-model="history.filterEndDate.value" label="Hasta" type="date" outlined dense />
        </div>
        <div class="col-12 col-md-4 row justify-end">
          <q-btn color="secondary" icon="search" label="Buscar" @click="history.loadData" :loading="store.loading" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla de Solicitudes Registradas -->
    <q-table
      :rows="history.groupedRequests.value"
      :columns="history.historyColumns"
      row-key="id"
      :loading="store.loading"
      flat
      bordered
      class="shadow-1"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.status === 'DELETED' ? 'grey' : (props.row.status === 'APPROVED' ? 'positive' : 'warning')" text-color="white" size="sm">
            {{ props.row.status === 'DELETED' ? 'ELIMINADA' : (props.row.status === 'APPROVED' ? 'APROBADO' : (props.row.status === 'PENDING' ? 'PENDIENTE' : props.row.status)) }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-details="props">
        <q-td :props="props">
          {{ props.row.totalDiners }} platos
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-sm text-right">
          <!-- Ver Detalles -->
          <q-btn 
            flat 
            round 
            color="primary" 
            icon="visibility" 
            size="sm" 
            @click="formModal?.loadExistingData(props.row)"
          >
            <q-tooltip>Ver Detalles</q-tooltip>
          </q-btn>
          <!-- Editar -->
          <q-btn 
            flat 
            round 
            color="warning" 
            icon="edit" 
            size="sm" 
            @click="formModal?.loadExistingData(props.row, true)"
            v-if="auth.hasPermission('DINERS_REQUESTS', 'canUpdate') && !props.row.isDeleted"
          >
            <q-tooltip>Editar Solicitud</q-tooltip>
          </q-btn>
          <!-- Baja / Cancelar -->
          <q-btn 
            flat 
            round 
            color="negative" 
            icon="delete" 
            size="sm" 
            @click="history.confirmDelete(props.row)"
            v-if="auth.hasPermission('DINERS_REQUESTS', 'canDelete') && !props.row.isDeleted"
          >
            <q-tooltip>Dar de baja / Cancelar Lote</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Componente del Modal de Solicitud -->
    <RequestFormModal ref="formModal" @success="history.loadData" />

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useDinerRequestHistory } from '~/composables/features/useDinerRequestHistory'
import { useAuthStore } from '~/stores/auth'
import { useSettingsStore } from '~/stores/settings'
import { useDependenciesStore } from '~/stores/dependencies'
import { useSquadsStore } from '~/stores/squads'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useMealSchedulesStore } from '~/stores/mealSchedules'
import { useDinersStore } from '~/stores/diners'
import RequestFormModal from '~/components/diners/requests/RequestFormModal.vue'

const store = useDinerRequestsStore()
const history = useDinerRequestHistory()
const auth = useAuthStore()

// Store dependencies required for history page and general preload
const settingsStore = useSettingsStore()
const dependenciesStore = useDependenciesStore()
const squadsStore = useSquadsStore()
const diningRoomsStore = useDiningRoomsStore()
const schedulesStore = useMealSchedulesStore()
const dinersStore = useDinersStore()

// Referencia al modal hijo para abrirlo
const formModal = ref<InstanceType<typeof RequestFormModal> | null>(null)

onMounted(async () => {
  history.loadData()
  // Precarga de diccionarios necesarios para el funcionamiento global del módulo
  await Promise.all([
    settingsStore.fetchCutoffRules(),
    dependenciesStore.fetchAll(),
    squadsStore.fetchAll(),
    diningRoomsStore.fetchAll(),
    schedulesStore.fetchSchedules(),
    dinersStore.fetchAll()
  ])
})
</script>
