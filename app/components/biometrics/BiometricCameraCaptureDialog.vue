<template>
  <q-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" persistent>
    <q-card class="q-pa-sm" style="min-width: 400px; max-width: 500px; width: 100%">
      
      <!-- Cabecera -->
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="camera_front" color="primary" text-color="white" size="md" class="q-mr-sm" />
        <div>
          <div class="text-h6 text-weight-bold text-grey-9">Enrolamiento Facial en Terminal</div>
          <div class="text-caption text-grey-6">Cédula: <strong>{{ cedula }}</strong></div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="isDeviceCapturing" />
      </q-card-section>

      <!-- Ficha del Comensal (Nombre y Dependencia) -->
      <q-card-section class="q-pt-sm q-pb-xs">
        <div class="bg-blue-1 q-pa-sm rounded-borders" style="border: 1px solid #bbdefb">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <q-icon name="badge" color="primary" size="20px" class="q-mr-xs" />
              <div class="text-subtitle1 text-weight-bold text-primary">
                {{ displayName || 'Buscando datos del comensal...' }}
              </div>
            </div>
            <div class="row q-gutter-xs">
              <q-badge v-if="rationType" color="teal-8" text-color="white">{{ rationType }}</q-badge>
            </div>
          </div>
          <div v-if="subdependencyName" class="text-caption text-grey-8 q-mt-xs">
            <q-icon name="business" size="14px" class="q-mr-xs" /> {{ subdependencyName }}
          </div>
        </div>
      </q-card-section>

      <!-- Selector de Terminal / Comedor -->
      <q-card-section class="q-pt-xs q-pb-xs">
        <q-select
          :model-value="selectedDiningRoomId"
          @update:model-value="selectDiningRoom"
          :options="availableTerminals"
          option-value="id"
          option-label="name"
          emit-value
          map-options
          label="Terminal Biométrico Autorizado"
          outlined
          dense
          :disable="isDeviceCapturing"
        >
          <template v-slot:prepend>
            <q-icon name="router" color="primary" />
          </template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <q-icon name="camera_front" color="teal" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ scope.opt.name }}</q-item-label>
                <q-item-label caption>{{ scope.opt.deviceIp }}:{{ scope.opt.devicePort || 443 }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>

      <!-- Panel Central de Estado e Instrucciones -->
      <q-card-section class="text-center q-py-sm">
        <div class="bg-grey-1 rounded-borders q-pa-md column items-center" style="border: 1px solid #cfd8dc">
          
          <!-- ESTADO 1: Captura en Progreso en el Hardware -->
          <template v-if="isDeviceCapturing">
            <q-spinner-puff color="teal" size="64px" />
            <div class="text-h6 text-weight-bold text-teal-9 q-mt-sm">Pantalla del Terminal Activa</div>
            <div class="text-body2 text-grey-8 q-mt-xs">
              Pida a <strong>{{ displayName || 'el trabajador' }}</strong> que mire la pantalla del biométrico y presione el botón azul de captura.
            </div>
            <q-chip color="teal-1" text-color="teal-10" icon="touch_app" class="q-mt-sm text-weight-medium">
              Esperando captura en el biométrico...
            </q-chip>
          </template>

          <!-- ESTADO 2: Listo para Activar -->
          <template v-else>
            <q-avatar size="56px" color="teal-1" text-color="teal-8" icon="touch_app" class="q-mb-xs" />
            <div class="text-subtitle1 text-weight-bold text-dark">Captura Directa por Hardware</div>
            <div class="text-body2 text-grey-7 q-mt-xs text-center" style="max-width: 340px">
              Al presionar el botón, el biométrico abrirá su pantalla táctil interactiva para validar el rostro a 60 FPS.
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">
              ✨ La foto se vinculará a la cédula <strong>{{ cedula }}</strong> y se replicará en las sedes.
            </div>
          </template>

        </div>
      </q-card-section>

      <!-- Botones de Acción -->
      <q-card-actions align="right" class="q-px-md q-pb-md q-gutter-sm">
        <q-btn
          flat
          label="Cerrar"
          color="grey-7"
          v-close-popup
          :disable="isDeviceCapturing"
        />

        <q-btn
          color="teal-8"
          unelevated
          size="md"
          icon="camera_front"
          label="Activar Pantalla del Terminal"
          :loading="isDeviceCapturing"
          :disable="!selectedDiningRoomId"
          @click="onDirectDeviceCapture"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBiometricCameraCapture } from '~/composables/features/useBiometricCameraCapture'
import { useDinersStore } from '~/stores/diners'

const props = defineProps<{
  modelValue: boolean
  cedula: string
  dinerName?: string
  defaultDiningRoomId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'enrolled', result: { photoUrl: string }): void
}>()

const dinersStore = useDinersStore()
const loadedDiner = ref<any>(null)

const {
  selectedDiningRoomId,
  isDeviceCapturing,
  availableTerminals,
  selectDiningRoom,
  captureDirectFromDevice
} = useBiometricCameraCapture()

const displayName = computed(() => {
  return props.dinerName || loadedDiner.value?.name || ''
})

const subdependencyName = computed(() => {
  return loadedDiner.value?.subdependency?.name || loadedDiner.value?.squad?.name || ''
})

const rationType = computed(() => {
  return loadedDiner.value?.rationType || ''
})

async function fetchDinerDetails(cedula: string) {
  if (!cedula) return
  try {
    const data = await dinersStore.fetchByCedula(cedula)
    loadedDiner.value = data
  } catch {
    loadedDiner.value = null
  }
}

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (props.defaultDiningRoomId) {
      selectDiningRoom(props.defaultDiningRoomId)
    }
    if (!props.dinerName && props.cedula) {
      await fetchDinerDetails(props.cedula)
    }
  } else {
    loadedDiner.value = null
  }
})

watch(() => props.cedula, async (newCedula) => {
  if (props.modelValue && newCedula && !props.dinerName) {
    await fetchDinerDetails(newCedula)
  }
})

function onDialogUpdate(val: boolean) {
  emit('update:modelValue', val)
}

async function onDirectDeviceCapture() {
  const result = await captureDirectFromDevice(props.cedula)
  if (result.success && result.photoUrl) {
    emit('enrolled', { photoUrl: result.photoUrl })
    emit('update:modelValue', false)
  }
}
</script>
