<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ diningRoomId: number | null }>()

const shiftOptions = [
  { label: 'Todos los Turnos', value: null },
  { label: 'DESAYUNO', value: 'DESAYUNO' },
  { label: 'ALMUERZO', value: 'ALMUERZO' },
  { label: 'CENA', value: 'CENA' },
  { label: 'SOBRECENA', value: 'SOBRECENA' },
]
const shiftType = ref<string | null>(null)
const dateStr = ref(new Date().toISOString().split('T')[0])
const dependencyId = ref<number | null>(null)
const subdependencyId = ref<number | null>(null)

const pendingList = ref<any[]>([])
const selectedRows = ref<any[]>([])
const loadingList = ref(false)
const dispatching = ref(false)
const actionMessage = ref('')
const actionError = ref('')

const { data: dependencies } = useFetch('/api/dependencies')

const availableSubdeps = computed(() => {
  if (!dependencyId.value || !dependencies.value) return []
  const dep = (dependencies.value as any[]).find((d: any) => d.id === dependencyId.value)
  return dep?.subdependencies ?? []
})

watch(dependencyId, () => { subdependencyId.value = null })

const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left' as const, sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' as const, sortable: true },
  { name: 'dependencyName', label: 'Dependencia', field: 'dependencyName', align: 'left' as const },
  { name: 'subdependencyName', label: 'Subdependencia', field: 'subdependencyName', align: 'left' as const },
  { name: 'rationType', label: 'Dieta', field: 'rationType', align: 'center' as const },
]

const onSearch = async () => {
  if (!dateStr.value) return
  loadingList.value = true
  actionMessage.value = ''
  actionError.value = ''
  selectedRows.value = []

  try {
    const res = await $fetch('/api/dispatch/pending-list', {
      params: {
        date: dateStr.value,
        diningRoomId: props.diningRoomId,
        ...(shiftType.value ? { shiftType: shiftType.value } : {}),
        ...(subdependencyId.value ? { subdependencyId: subdependencyId.value } : {}),
        ...(dependencyId.value && !subdependencyId.value ? { dependencyId: dependencyId.value } : {})
      }
    })
    pendingList.value = res as any[]
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error al consultar'
    pendingList.value = []
  } finally {
    loadingList.value = false
  }
}

const onBulkDispatch = async () => {
  if (!props.diningRoomId) {
    actionError.value = 'Debe seleccionar un Comedor en la cabecera de la pantalla.'
    return
  }
  if (selectedRows.value.length === 0) return

  dispatching.value = true
  actionMessage.value = ''
  actionError.value = ''

  try {
    const res = await $fetch('/api/dispatch/bulk-dispatch', {
      method: 'POST',
      body: { detailIds: selectedRows.value.map(r => r.id), diningRoomId: props.diningRoomId }
    })
    actionMessage.value = (res as any).message
    await onSearch()
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error al despachar'
  } finally {
    dispatching.value = false
  }
}
</script>

<template>
  <div>
    <!-- Filtros -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-input v-model="dateStr" type="date" label="Fecha *" outlined dense bg-color="white" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="shiftType"
          :options="shiftOptions"
          option-value="value"
          option-label="label"
          emit-value
          map-options
          label="Tipo de Servicio"
          outlined dense bg-color="white"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="dependencyId"
          :options="(dependencies as any[]) || []"
          option-value="id"
          option-label="name"
          emit-value map-options clearable
          label="Dependencia"
          outlined dense bg-color="white"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="subdependencyId"
          :options="availableSubdeps"
          option-value="id"
          option-label="name"
          emit-value map-options clearable
          label="Subdependencia"
          outlined dense bg-color="white"
          :disable="!dependencyId"
        />
      </div>
      <div class="col-12 flex justify-end">
        <q-btn
          label="Buscar Pendientes"
          icon="search"
          color="primary"
          unelevated
          :loading="loadingList"
          :disable="!dateStr || !diningRoomId"
          @click="onSearch"
        />
      </div>
    </div>

    <!-- Banner sin comedor -->
    <q-banner v-if="!diningRoomId" class="bg-amber-2 text-amber-10 q-mb-md rounded-borders">
      <template v-slot:avatar><q-icon name="warning" color="amber-10" /></template>
      Seleccione un Comedor de Operación en la cabecera para poder despachar.
    </q-banner>

    <!-- Alertas de acción -->
    <q-banner v-if="actionError" class="bg-negative text-white q-mb-md rounded-borders">
      <template v-slot:avatar><q-icon name="error" /></template>
      {{ actionError }}
    </q-banner>
    <q-banner v-if="actionMessage" class="bg-positive text-white q-mb-md rounded-borders">
      <template v-slot:avatar><q-icon name="check_circle" /></template>
      {{ actionMessage }}
    </q-banner>

    <!-- Tabla -->
    <q-table
      title="Raciones Pendientes por Despachar"
      :rows="pendingList"
      :columns="columns"
      row-key="id"
      selection="multiple"
      v-model:selected="selectedRows"
      :loading="loadingList"
      class="shadow-1 rounded-borders"
      no-data-label="Aplique los filtros y presione Buscar."
      :rows-per-page-options="[10, 25, 50, 100, 0]"
    >
      <template v-slot:top-right>
        <q-btn
          v-if="selectedRows.length > 0"
          color="positive"
          icon="send"
          :label="`Despachar Seleccionados (${selectedRows.length})`"
          unelevated
          :loading="dispatching"
          :disable="!diningRoomId"
          @click="onBulkDispatch"
        />
      </template>
    </q-table>
  </div>
</template>
