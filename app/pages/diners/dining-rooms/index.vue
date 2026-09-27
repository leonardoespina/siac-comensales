<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Gestión de Comedores</div>

    <SharedCrudTable
      title="Comedores"
      :columns="columns"
      :rows="store.diningRooms"
      :filter="filter"
      :loading="store.isLoading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-device="props">
        <q-td :props="props">
          <q-chip 
            v-if="props.row.deviceIp" 
            :color="props.row.deviceEnabled ? 'teal-1' : 'grey-3'" 
            :text-color="props.row.deviceEnabled ? 'teal-9' : 'grey-7'" 
            size="sm" 
            icon="videocam"
          >
            {{ props.row.deviceIp }}:{{ props.row.devicePort || 443 }}
          </q-chip>
          <span v-else class="text-grey-5 text-caption">Sin Terminal</span>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Comedor' : 'Nuevo Comedor'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre del Comedor *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      
      <q-select
        v-model="form.siteId"
        :options="sitesStore.sites"
        option-value="id"
        option-label="name"
        emit-value
        map-options
        label="Sede *"
        outlined
        dense
        class="q-mt-md"
        :rules="[val => (val !== null && val !== undefined && val !== '') || 'La Sede es requerida']"
      />

      <!-- Sección de Parametrización Biométrica Hikvision -->
      <div class="q-mt-lg q-pt-sm">
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mb-sm">
          <q-icon name="settings_remote" class="q-mr-xs" size="sm" />
          Terminal de Reconocimiento Facial (Hikvision)
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          Configure la IP y credenciales del terminal asignado a este comedor para activar el despacho automático.
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-8">
            <q-input
              v-model="form.deviceIp"
              label="Dirección IP del Terminal"
              outlined
              dense
              placeholder="Ej: 10.60.0.110"
            >
              <template v-slot:prepend>
                <q-icon name="router" />
              </template>
            </q-input>
          </div>
          <div class="col-4">
            <q-input
              v-model.number="form.devicePort"
              type="number"
              label="Puerto"
              outlined
              dense
            />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mt-xs">
          <div class="col-6">
            <q-input
              v-model="form.deviceUser"
              label="Usuario ISAPI"
              outlined
              dense
              placeholder="admin"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model="form.devicePassword"
              type="password"
              label="Contraseña"
              outlined
              dense
            />
          </div>
        </div>

        <div class="row items-center justify-between q-mt-md">
          <q-toggle
            v-model="form.deviceEnabled"
            label="Terminal Activo"
            color="primary"
          />

          <q-btn
            outline
            color="primary"
            icon="wifi_tethering"
            label="Probar Conexión"
            dense
            class="q-px-sm"
            :loading="isTestingDevice"
            :disable="!form.deviceIp"
            @click="testDeviceConnection"
          >
            <q-tooltip>Valida conectividad y autenticación con el terminal</q-tooltip>
          </q-btn>
        </div>

        <!-- Feedback de Prueba Exitosa -->
        <q-banner v-if="deviceTestResult" dense class="bg-green-1 text-green-10 rounded-borders q-mt-sm">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="positive" />
          </template>
          <div class="text-weight-bold">Conexión Verificada: {{ deviceTestResult.model }}</div>
          <div class="text-caption">Serial: {{ deviceTestResult.serialNumber }} | Firmware: {{ deviceTestResult.firmware }}</div>
        </q-banner>
      </div>

      <q-separator class="q-my-md" />

      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Comedor Operativo"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useSitesStore } from '~/stores/sites'
import { useDiningRoomForm } from '~/composables/features/useDiningRoomForm'

const store = useDiningRoomsStore()
const sitesStore = useSitesStore()

const {
  isDialogOpen,
  isEditing,
  isTestingDevice,
  deviceTestResult,
  form,
  openCreate,
  openEdit,
  testDeviceConnection,
  submit,
  remove
} = useDiningRoomForm()

const filter = ref('')

const columns = [
  { name: 'name', label: 'Nombre del Comedor', field: 'name', align: 'left' as const, sortable: true },
  { name: 'site', label: 'Sede', field: (row: any) => row.site?.name, align: 'left' as const, sortable: true },
  { name: 'device', label: 'Terminal Hikvision', field: 'deviceIp', align: 'center' as const, sortable: true },
  { name: 'status', label: 'Estado', field: 'active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' as const }
]

onMounted(() => {
  store.fetchAll()
  sitesStore.fetchSites()
})
</script>
