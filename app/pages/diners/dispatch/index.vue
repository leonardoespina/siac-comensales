<template>
  <q-page class="q-pa-lg">
    <!-- Pantalla Principal del Kiosco (siempre visible) -->
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="shadow-4 bg-white rounded-borders">
          <!-- Encabezado -->
          <q-card-section class="bg-primary text-white text-center">
            <div class="text-h5"><q-icon name="restaurant" size="md" class="q-mr-sm"/> Punto de Despacho</div>
            <div class="text-subtitle2" v-if="selectedDiningRoomId">
              Ubicación: {{ currentDiningRoomName }}
              <q-btn 
                v-if="diningRooms.length > 1" 
                flat 
                dense 
                icon="swap_horiz" 
                label="Cambiar Sede" 
                size="sm" 
                @click="isDiningRoomModalOpen = true" 
                class="q-ml-sm text-yellow-11"
              >
                <q-tooltip>Intercambiar entre sus sedes autorizadas</q-tooltip>
              </q-btn>
              <q-chip v-else color="blue-10" text-color="white" size="xs" icon="lock" class="q-ml-sm">
                Sede Única Asignada
              </q-chip>
            </div>
            <div class="text-subtitle2" v-else>Control de acceso y entrega de bandejas en puerta</div>
          </q-card-section>

          <!-- Banner de Resultado (visible solo cuando hay respuesta) -->
          <q-banner
            v-if="overlayStatus !== 'idle'"
            :class="overlayStatus === 'success' ? 'bg-positive text-white' : 'bg-negative text-white'"
            class="q-px-lg q-py-md text-center"
          >
            <template v-slot:avatar>
              <q-icon
                :name="overlayStatus === 'success' ? 'check_circle' : 'cancel'"
                size="48px"
              />
            </template>
            <div class="text-h5 text-weight-bold">{{ overlayTitle }}</div>
            <div class="text-subtitle1">{{ overlayMessage }}</div>

            <!-- Botón de Enrolamiento Inmediato si falló o no tenía comida -->
            <div v-if="overlayStatus === 'error' && searchCedula" class="q-mt-sm">
              <q-btn
                outline
                dense
                color="white"
                icon="camera_alt"
                label="Aprovechar y Enrolar Foto Facial"
                size="sm"
                @click="openEnrollModal(searchCedula)"
              />
            </div>
          </q-banner>

          <!-- Sección Central: Modo Reposo vs Modo Despacho con Foto Facial -->
          <q-card-section class="text-center q-py-xl bg-grey-1">
            <!-- CASO 1: Comensal Identificado y Despachado con Éxito (Muestra Foto Real) -->
            <div v-if="overlayStatus === 'success' && lastDispatchResult?.diner" class="column items-center">
              <q-avatar size="140px" class="shadow-4 bg-white q-mb-md">
                <img 
                  :src="`/api/biometrics/face/${lastDispatchResult.diner.cedula}`" 
                  @error="(e: any) => e.target.style.display = 'none'"
                />
                <q-icon name="person" size="90px" color="primary" />
              </q-avatar>

              <div class="text-h4 text-weight-bolder text-dark q-mt-xs">
                {{ lastDispatchResult.diner.name }}
              </div>
              
              <div class="text-h6 text-grey-8 q-mt-xs">
                Cédula: <strong>{{ lastDispatchResult.diner.cedula }}</strong>
              </div>

              <div class="row q-gutter-sm justify-center q-mt-sm">
                <q-chip color="primary" text-color="white" icon="restaurant" size="md">
                  Turno: {{ lastDispatchResult.dispatch?.shift || 'Despacho' }}
                </q-chip>
                <q-chip 
                  :color="lastDispatchResult.diner.rationType === 'NORMAL' ? 'teal' : 'orange-9'" 
                  text-color="white" 
                  icon="local_dining" 
                  size="md"
                >
                  Ración: {{ lastDispatchResult.diner.rationType || 'NORMAL' }}
                </q-chip>
              </div>

              <!-- Botón rápido para capturar/actualizar foto -->
              <div class="q-mt-md">
                <q-btn
                  outline
                  color="primary"
                  icon="camera_alt"
                  label="Enrolar / Actualizar Foto"
                  size="sm"
                  @click="openEnrollModal(lastDispatchResult.diner.cedula, lastDispatchResult.diner.name)"
                />
              </div>

              <div class="text-caption text-grey-6 q-mt-sm" v-if="lastDispatchResult.diner.subdependency">
                {{ lastDispatchResult.diner.subdependency.name }}
              </div>
            </div>

            <!-- CASO 2: Modo Reposo (Esperando que alguien se pare frente a la cámara) -->
            <div v-else class="column items-center">
              <div class="q-mb-md">
                <q-icon 
                  :name="isVerifying ? 'sync' : 'face'" 
                  size="120px" 
                  :color="isVerifying ? 'primary' : 'positive'"
                />
              </div>
              
              <div class="text-h4 text-dark q-mt-md">
                {{ isVerifying ? 'Procesando Ración...' : 'Párese frente al Biométrico' }}
              </div>
              <div class="text-body1 text-grey-7 q-mt-sm">
                {{ isVerifying ? 'Validando ración en el sistema...' : 'El terminal Hikvision identificará su rostro y registrará su bandeja en vivo' }}
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Búsqueda Manual (Plan B) -->
          <q-card-section class="q-py-md">
            <div class="text-subtitle1 text-grey-8 q-mb-sm text-center">¿Sin rostro? Búsqueda Manual por Cédula</div>
            <q-form @submit.prevent="processManualDispatch" class="row q-col-gutter-sm items-center justify-center">
              <div class="col-7">
                <q-input
                  v-model="searchCedula"
                  label="Cédula del Comensal"
                  outlined
                  dense
                  clearable
                  @clear="clearSearch"
                  bg-color="white"
                  :loading="isSearching"
                  hint="Ej: V-12345678"
                  :disable="!selectedDiningRoomId"
                >
                  <template v-slot:prepend>
                    <q-icon name="badge" />
                  </template>
                </q-input>
              </div>
              <div class="col-3" style="margin-top: -18px">
                <q-btn
                  color="secondary"
                  label="Despachar"
                  type="submit"
                  class="full-width"
                  size="md"
                  icon="check_circle"
                  :disable="!searchCedula || isSearching || !selectedDiningRoomId"
                />
              </div>
              <div class="col-2" style="margin-top: -18px">
                <q-btn
                  outline
                  color="primary"
                  icon="camera_alt"
                  class="full-width"
                  size="md"
                  :disable="!searchCedula || !selectedDiningRoomId"
                  @click="openEnrollModal(searchCedula)"
                >
                  <q-tooltip>Enrolar foto facial</q-tooltip>
                </q-btn>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal Bloqueante: Selección de Comedor (Al arrancar) -->
    <q-dialog v-model="isDiningRoomModalOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6"><q-icon name="storefront" class="q-mr-xs"/> Configurar Punto de Despacho</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 q-mb-md text-grey-8">
            Seleccione la sede y comedor autorizado donde operará este punto de despacho:
          </div>
          <q-select
            v-model="tempDiningRoomId"
            :options="diningRooms"
            option-value="id"
            :option-label="d => d.site?.name ? `${d.name} — Sede ${d.site.name}` : d.name"
            label="Comedor / Sede Autorizada *"
            outlined
            emit-value
            map-options
          >
            <template v-slot:prepend>
              <q-icon name="storefront" />
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Confirmar Ubicación" :disable="!tempDiningRoomId" @click="saveDiningRoomSelection(tempDiningRoomId as number)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal Universal de Captura y Enrolamiento Facial -->
    <BiometricCameraCaptureDialog
      v-model="isEnrollModalOpen"
      :cedula="enrollCedula"
      :diner-name="enrollDinerName"
      :default-dining-room-id="selectedDiningRoomId"
      @enrolled="onPhotoEnrolled"
    />

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import BiometricCameraCaptureDialog from '~/components/biometrics/BiometricCameraCaptureDialog.vue'
import { useDispatchManagement } from '~/composables/features/useDispatchManagement'

const {
  searchCedula,
  isSearching,
  overlayStatus,
  overlayMessage,
  overlayTitle,
  lastDispatchResult,
  isDiningRoomModalOpen,
  diningRooms,
  selectedDiningRoomId,
  isVerifying,
  saveDiningRoomSelection,
  processManualDispatch,
  clearSearch,
  stopKioskLoop
} = useDispatchManagement()

const tempDiningRoomId = ref<number | null>(null)

// Control de Enrolamiento Facial en Vivo
const isEnrollModalOpen = ref(false)
const enrollCedula = ref('')
const enrollDinerName = ref('')

function openEnrollModal(cedula: string, name = '') {
  enrollCedula.value = cedula
  enrollDinerName.value = name
  isEnrollModalOpen.value = true
}

async function onPhotoEnrolled(_res: { photoUrl: string }) {
  // Si el comensal estaba siendo buscado manualmente, ejecutar el despacho de comida de inmediato
  if (enrollCedula.value) {
    searchCedula.value = enrollCedula.value
    await processManualDispatch()
  }
}

const currentDiningRoomName = computed(() => {
  const dr = diningRooms.value.find(d => d.id === selectedDiningRoomId.value)
  if (!dr) return ''
  return dr.site?.name ? `${dr.name} — Sede ${dr.site.name}` : dr.name
})

onUnmounted(() => {
  stopKioskLoop()
})
</script>
