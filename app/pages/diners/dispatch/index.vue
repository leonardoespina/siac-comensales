<template>
  <q-page class="q-pa-lg">
    <!-- Pantalla Principal del Kiosco -->
    <div class="row q-col-gutter-md justify-center" v-if="overlayStatus === 'idle'">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="shadow-4 bg-white rounded-borders">
          <!-- Encabezado -->
          <q-card-section class="bg-primary text-white text-center">
            <div class="text-h5"><q-icon name="restaurant" size="md" class="q-mr-sm"/> Punto de Despacho</div>
            <div class="text-subtitle2" v-if="selectedDiningRoomId">
              Ubicación: {{ currentDiningRoomName }}
              <q-btn flat dense icon="edit" size="sm" @click="isDiningRoomModalOpen = true" class="q-ml-sm" />
            </div>
            <div class="text-subtitle2" v-else>Control de acceso y entrega de bandejas en puerta</div>
          </q-card-section>

          <!-- Animación Biométrica Continua -->
          <q-card-section class="text-center q-py-xl bg-grey-1">
            <!-- Icono animado según estado -->
            <div class="q-mb-md">
              <q-icon 
                name="fingerprint" 
                size="120px" 
                :color="isReaderConnected ? (isVerifying ? 'primary' : 'positive') : 'grey-5'"
                :class="{'pulsing-icon': isVerifying}"
              />
            </div>
            
            <div class="text-h4 text-dark q-mt-md">
              {{ isReaderConnected ? (isVerifying ? 'Analizando Huella...' : 'Coloque su dedo') : 'Lector Desconectado' }}
            </div>
            <div class="text-body1 text-grey-7 q-mt-sm">
              {{ isReaderConnected ? 'El sistema está esperando automáticamente' : 'Verifique la conexión USB del sensor U.are.U 5160' }}
            </div>
          </q-card-section>

          <q-separator />

          <!-- Búsqueda Manual (Plan B) -->
          <q-card-section class="q-py-md">
            <div class="text-subtitle1 text-grey-8 q-mb-sm text-center">¿Sin huella? Búsqueda Manual</div>
            <q-form @submit.prevent="processManualDispatch" class="row q-col-gutter-sm items-center justify-center">
              <div class="col-8">
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
              <div class="col-4" style="margin-top: -18px">
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
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Overlay de Éxito o Error (Oculta la pantalla principal) -->
    <div 
      v-else 
      class="fixed-full flex flex-center z-max"
      :class="overlayStatus === 'success' ? 'bg-positive text-white' : 'bg-negative text-white'"
    >
      <div class="text-center">
        <q-icon :name="overlayStatus === 'success' ? 'check_circle' : 'cancel'" size="150px" class="q-mb-lg" />
        <div class="text-h2 text-weight-bold q-mb-md">{{ overlayTitle }}</div>
        <div class="text-h4">{{ overlayMessage }}</div>
      </div>
    </div>

    <!-- Modal Bloqueante: Selección de Comedor (Al arrancar) -->
    <q-dialog v-model="isDiningRoomModalOpen" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Configurar Punto de Despacho</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 q-mb-md text-grey-8">
            Por favor, seleccione el comedor donde se encuentra ubicado este lector.
          </div>
          <q-select
            v-model="tempDiningRoomId"
            :options="diningRooms"
            option-value="id"
            option-label="name"
            label="Comedor Actual"
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
          <q-btn flat label="Guardar Ubicación" :disable="!tempDiningRoomId" @click="saveDiningRoomSelection(tempDiningRoomId as number)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useDispatchManagement } from '~/composables/features/useDispatchManagement'

const {
  searchCedula,
  isSearching,
  overlayStatus,
  overlayMessage,
  overlayTitle,
  isDiningRoomModalOpen,
  diningRooms,
  selectedDiningRoomId,
  isReaderConnected,
  isVerifying,
  saveDiningRoomSelection,
  processManualDispatch,
  clearSearch,
  stopKioskLoop
} = useDispatchManagement()

const tempDiningRoomId = ref<number | null>(null)

const currentDiningRoomName = computed(() => {
  const dr = diningRooms.value.find(d => d.id === selectedDiningRoomId.value)
  return dr ? dr.name : ''
})

// Detener el lector si cambiamos de pantalla
onUnmounted(() => {
  stopKioskLoop()
})
</script>
