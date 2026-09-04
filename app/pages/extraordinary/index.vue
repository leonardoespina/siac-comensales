<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div class="text-h5 text-primary">Visitas y Extraordinarios</div>
      <q-btn color="primary" icon="add" label="Registrar Visita" @click="controller.openForm" />
    </div>

    <!-- Filtros Superiores -->
    <q-card class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input 
            :model-value="controller.searchDate.value" 
            @update:model-value="controller.setSearchDate"
            type="date" 
            label="Fecha" 
            outlined 
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select 
            :model-value="controller.searchDiningRoom.value" 
            @update:model-value="controller.setSearchDiningRoom"
            :options="controller.diningRoomsOptions.value" 
            label="Comedor (Opcional)" 
            outlined 
            clearable
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-4 text-right">
          <q-btn color="primary" icon="search" label="Buscar" @click="controller.performSearch" :loading="controller.isLoading.value" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla de Historial -->
    <q-card>
      <q-table
        :rows="controller.dispatches.value"
        :columns="columns"
        row-key="id"
        :loading="controller.isLoading.value"
        no-data-label="No se encontraron registros de visitas"
      >
        <template v-slot:body-cell-modality="props">
          <q-td :props="props">
            <q-badge :color="props.row.modality === 'DINE_IN' ? 'blue' : 'orange'">
              {{ props.row.modality === 'DINE_IN' ? 'Bandeja' : 'Para Llevar' }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.status === 'APPROVED' ? 'positive' : props.row.status === 'REJECTED' ? 'negative' : 'warning'">
              {{ props.row.status === 'APPROVED' ? 'Aprobado' : props.row.status === 'REJECTED' ? 'Rechazado' : 'Pendiente' }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-dispatcher="props">
          <q-td :props="props">
            {{ props.row.dispatcher?.name || 'Sistema' }}
          </q-td>
        </template>
        <template v-slot:body-cell-dispatchedAt="props">
          <q-td :props="props">
            {{ new Date(props.row.dispatchedAt).toLocaleTimeString() }}
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <template v-if="props.row.status === 'PENDING'">
              <q-btn flat round dense color="positive" icon="check" @click="controller.approveDispatch(props.row.id)">
                <q-tooltip>Aprobar</q-tooltip>
              </q-btn>
              <q-btn flat round dense color="negative" icon="close" @click="controller.rejectDispatch(props.row.id)">
                <q-tooltip>Rechazar</q-tooltip>
              </q-btn>
            </template>
            <q-btn flat round dense color="primary" icon="edit" @click="controller.openEditForm(props.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat round dense color="negative" icon="delete" @click="controller.confirmDelete(props.row.id)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal de Formulario -->
    <ExtraordinaryFormModal 
      :model-value="controller.isModalOpen.value"
      @update:model-value="controller.setModalOpen"
      :form="controller.formData.value"
      :dining-rooms-options="controller.diningRoomsOptions.value"
      :dependencies-options="controller.dependenciesOptions.value"
      :get-subdependencies="controller.getSubdependencies"
      :is-global="controller.isGlobal.value"
      :is-submitting="controller.isSubmitting.value"
      @submit="controller.submitForm"
    />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useExtraordinary } from '~/composables/useExtraordinary'
import ExtraordinaryFormModal from '~/components/extraordinary/ExtraordinaryFormModal.vue'

const controller = useExtraordinary()

const columns = [
  { name: 'dispatchedAt', label: 'Hora', field: 'dispatchedAt', align: 'left' as const, sortable: true },
  { name: 'personId', label: 'Cédula/RIF', field: 'personId', align: 'left' as const },
  { name: 'companyName', label: 'Nombre/Empresa', field: 'companyName', align: 'left' as const },
  { name: 'dependency', label: 'Dependencia a Visitar', field: (row: any) => row.dependency?.name || 'N/A', align: 'left' as const },
  { name: 'subdependency', label: 'Subdependencia', field: (row: any) => row.subdependency?.name || 'N/A', align: 'left' as const },
  { name: 'shiftType', label: 'Servicio', field: 'shiftType', align: 'center' as const },
  { name: 'quantity', label: 'Cant.', field: 'quantity', align: 'center' as const },
  { name: 'modality', label: 'Modalidad', field: 'modality', align: 'center' as const },
  { name: 'diningRoom', label: 'Comedor', field: (row: any) => row.diningRoom?.name || 'N/A', align: 'left' as const },
  { name: 'dispatcher', label: 'Registrado Por', field: 'dispatcher', align: 'left' as const },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' as const }
]

onMounted(async () => {
  await controller.loadCatalogs()
  await controller.performSearch()
})
</script>
