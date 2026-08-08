<template>
  <q-card flat class="bg-white text-dark">
    <!-- Header -->
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
      
      <!-- Badge de Estado -->
      <q-badge v-if="savedTemplatesCount && savedTemplatesCount > 0" color="positive" class="q-pa-sm">
        <q-icon name="check_circle" class="q-mr-xs" />
        {{ savedTemplatesCount }} Huella(s) Registrada(s)
      </q-badge>
    </q-card-section>

    <!-- Área interactiva -->
    <q-card-section class="column items-center justify-center q-py-xl">
      <!-- Animación de Lector Unificada (Enroll y Verify) -->
      <div class="cursor-pointer relative-position q-mb-md flex flex-center" @click="handleAction" style="width: 140px; height: 140px; margin: 0 auto;">
        <!-- Anillo exterior giratorio (Radar) -->
        <q-circular-progress
          v-if="isCapturing || isVerifying"
          indeterminate
          size="130px"
          :thickness="0.04"
          color="primary"
          track-color="transparent"
          class="absolute-center"
        />
        <!-- Icono central enmarcado con llenado progresivo -->
        <q-avatar size="110px" :class="(isCapturing || isVerifying) ? 'bg-blue-1' : 'bg-transparent'">
          <q-icon 
            name="fingerprint" 
            size="80px" 
            class="fingerprint-icon"
            :class="{ 'pulsing-icon': (isCapturing || isVerifying) && (mode === 'VERIFY' || enrollmentSamples.length === 0) }"
            :style="{ '--fill-percent': mode === 'ENROLL' ? ((enrollmentSamples.length / 4) * 100) + '%' : (isVerifying ? '100%' : '0%') }"
          />
        </q-avatar>
      </div>

      <!-- Textos de Instrucción -->
      <div class="text-center q-gutter-xs">
        <div class="text-h6 text-weight-bold text-dark">{{ enrollmentStatusTitle || ui.statusTitle.value }}</div>
        <div class="text-caption text-grey-7">{{ enrollmentStatusDescription || ui.statusDescription.value }}</div>
      </div>

      <!-- Botón de Acción -->
      <div class="q-mt-lg row q-gutter-md">
        <q-btn 
          v-if="!isCapturing && !isVerifying" 
          :color="mode === 'ENROLL' ? 'primary' : 'secondary'"
          :label="mode === 'ENROLL' ? 'Registrar Huella' : 'Validar Huella'"
          :disable="!isReaderConnected"
          rounded
          unelevated
          class="q-px-lg"
          @click="manualStart"
        />
        
        <q-btn 
          v-if="isCapturing || isVerifying"
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
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useBiometrics } from '~/composables/features/useBiometrics'

const props = defineProps<{
  mode: 'ENROLL' | 'VERIFY'
  savedTemplatesCount?: number
  candidateTemplates?: string[]
}>()

const emit = defineEmits<{
  (e: 'captured', templateBase64: string): void
  (e: 'verified', success: boolean): void
}>()

const {
  isReaderConnected,
  isCapturing,
  isVerifying,
  enrollmentSamples,
  startMonitoring,
  stopMonitoring,
  enrollFingerprint,
  verifyFingerprint,
  cancelOperation,
  getUiState
} = useBiometrics()

// 1. Obtenemos estado UI directamente desde el composable (Cumple regla de Componente Delgado)
const ui = getUiState(props.mode, props.savedTemplatesCount)

const enrollmentStatusTitle = computed(() => {
  if (props.mode !== 'ENROLL' || !isCapturing.value) return null
  if (enrollmentSamples.value.length === 4) return 'Fusión en proceso...'
  return `Capturando Muestra ${enrollmentSamples.value.length + 1} de 4`
})

const enrollmentStatusDescription = computed(() => {
  if (props.mode !== 'ENROLL' || !isCapturing.value) return null
  if (enrollmentSamples.value.length === 0) return 'Coloque su dedo firmemente sobre el cristal'
  if (enrollmentSamples.value.length < 4) return 'Levante el dedo y vuelva a colocarlo'
  return 'Generando plantilla maestra...'
})

// 2. Lifecycle
const autoStartEnabled = ref(true)

watch(isReaderConnected, (connected) => {
  if (connected && autoStartEnabled.value && !isCapturing.value && !isVerifying.value) {
    handleAction()
  }
})

onMounted(() => {
  startMonitoring()
  if (isReaderConnected.value && autoStartEnabled.value) {
    handleAction()
  }
})

onUnmounted(() => {
  stopMonitoring()
  cancelOperation()
})

const manualStart = () => {
  autoStartEnabled.value = true
  handleAction()
}

const handleCancel = () => {
  autoStartEnabled.value = false
  cancelOperation()
}

// 3. Orquestador del evento click
const handleAction = async () => {
  if (!isReaderConnected.value || isCapturing.value || isVerifying.value) return

  if (props.mode === 'ENROLL') {
    const template = await enrollFingerprint()
    if (template) emit('captured', template)
    else if (autoStartEnabled.value) {
      setTimeout(() => { if (autoStartEnabled.value) handleAction() }, 1500)
    }
  } else if (props.mode === 'VERIFY') {
    if (!props.candidateTemplates?.length) return
    const matchedIndex = await verifyFingerprint(props.candidateTemplates)
    emit('verified', matchedIndex !== null)
    if (matchedIndex === null && autoStartEnabled.value) {
      setTimeout(() => { if (autoStartEnabled.value) handleAction() }, 1500)
    }
  }
}
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
