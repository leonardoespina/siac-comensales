<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 450px" class="bg-white text-dark">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Identificación Libre</div>
        <div class="text-subtitle2">Reconocimiento automático de comensal</div>
      </q-card-section>

      <q-card-section v-if="isLoading" class="column items-center justify-center q-py-xl">
        <q-spinner-dots color="primary" size="64px" />
        <div class="text-subtitle1 q-mt-md text-dark">Descargando base de datos biométrica...</div>
        <div class="text-caption text-grey-7">Preparando {{ totalTemplates }} huellas para validación</div>
      </q-card-section>

      <q-card-section v-else>
        <!-- Integración del Componente Real BiometricCapture en modo verificación manual -->
        <q-card flat class="bg-white text-dark">
          <q-card-section class="row items-center justify-between q-pb-none">
            <div class="row items-center q-gutter-sm">
              <q-avatar :color="isReaderConnected ? 'primary' : 'negative'" text-color="white" icon="usb" size="md" />
              <div>
                <div class="text-subtitle2 q-mb-none">Lector Biométrico</div>
                <div class="text-caption" :class="isReaderConnected ? 'text-primary' : 'text-negative'">
                  {{ isReaderConnected ? 'Conectado (U.are.U 5160)' : 'Desconectado - Revisar Middleware' }}
                </div>
              </div>
            </div>
            <q-badge color="primary" class="q-pa-sm">
              <q-icon name="group" class="q-mr-xs" />
              {{ totalTemplates }} huellas
            </q-badge>
          </q-card-section>

          <q-card-section class="column items-center justify-center q-py-xl">
            <div class="cursor-pointer relative-position q-mb-md flex flex-center" @click="handleAction" style="width: 140px; height: 140px; margin: 0 auto;">
              <!-- Anillo exterior giratorio (Radar) -->
              <q-circular-progress
                v-if="isVerifying"
                indeterminate
                size="130px"
                :thickness="0.04"
                color="primary"
                track-color="transparent"
                class="absolute-center"
              />
              <!-- Icono central enmarcado -->
              <q-avatar size="110px" :class="isVerifying ? 'bg-blue-1' : 'bg-transparent'">
                <q-icon 
                  name="fingerprint" 
                  size="80px" 
                  :color="iconColor"
                  :class="[isVerifying ? 'pulsing-icon' : '', isVerifying ? 'fingerprint-icon' : '']"
                  :style="isVerifying ? { '--fill-percent': '100%' } : {}"
                />
              </q-avatar>
            </div>

            <div class="text-center q-gutter-xs">
              <div class="text-h6 text-weight-bold text-dark">{{ statusTitle }}</div>
              <div class="text-caption text-grey-7">{{ statusDescription }}</div>
            </div>

            <div class="q-mt-lg row q-gutter-md">
              <q-btn 
                v-if="!isVerifying" 
                color="primary"
                label="Iniciar Identificación"
                :disable="!isReaderConnected"
                rounded
                unelevated
                class="q-px-lg"
                @click="manualStart"
              />
              <q-btn 
                v-if="isVerifying"
                color="negative"
                label="Cancelar"
                icon="close"
                flat
                rounded
                @click="handleCancel"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="Cerrar"
          color="grey"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGeneralIdentification } from '~/composables/features/useGeneralIdentification'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'identified'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const {
  isReaderConnected,
  isVerifying,
  isLoading,
  totalTemplates,
  iconColor,
  statusTitle,
  statusDescription,
  manualStart,
  handleCancel
} = useGeneralIdentification({
  isOpen,
  onIdentified: (diner) => {
    emit('identified', diner)
    isOpen.value = false
  }
})
</script>

<style scoped>
@property --fill-percent {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.fingerprint-icon {
  background: linear-gradient(
    to top, 
    #0052D4 0%, 
    #00E5FF var(--fill-percent), 
    #e2e8f0 var(--fill-percent)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: --fill-percent 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.pulsing-icon {
  animation: pulse-opacity 1.5s infinite alternate ease-in-out;
}

@keyframes pulse-opacity {
  0% { opacity: 0.6; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1.05); }
}
</style>
