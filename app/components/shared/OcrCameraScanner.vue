<template>
  <q-dialog v-model="isOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down" @hide="stopCamera">
    <q-card class="bg-black text-white column">
      <!-- Toolbar -->
      <q-toolbar class="bg-dark">
        <q-btn flat round dense icon="close" v-close-popup />
        <q-toolbar-title class="text-subtitle1">Escanear Texto</q-toolbar-title>
      </q-toolbar>

      <!-- Contenedor del Video -->
      <div class="col relative-position flex flex-center" style="overflow: hidden;">
        <!-- El video debe tener playsinline para funcionar en iOS Safari -->
        <video 
          ref="videoRef" 
          autoplay 
          playsinline 
          class="full-width full-height" 
          style="object-fit: cover;"
        ></video>

        <!-- Retícula de Escaneo -->
        <div class="ocr-target-box"></div>
        <div class="absolute-bottom text-center q-pa-lg text-amber-4 text-weight-bold" style="text-shadow: 1px 1px 4px black;">
          Alinee el nombre del producto en el recuadro
        </div>

        <!-- Canvas Oculto (Se usa para tomar la foto del video) -->
        <canvas ref="canvasRef" style="display: none;"></canvas>
      </div>

      <!-- Footer de Status -->
      <div class="bg-dark q-pa-md text-center">
        <div v-if="error" class="text-red">{{ error }}</div>
        <div v-else-if="isInitializing">
          <q-spinner-dots color="amber" size="2em" />
          <div class="text-caption q-mt-sm">Preparando Inteligencia Artificial... {{ initializationProgress }}%</div>
        </div>
        <div v-else-if="isProcessing">
          <q-spinner-ios color="amber" size="2em" />
          <div class="text-caption q-mt-sm">Leyendo texto...</div>
        </div>
        <div v-else>
          <q-icon name="visibility" size="2em" color="grey-5" />
          <div class="text-caption text-grey-5 q-mt-sm">Buscando patrones de texto</div>
        </div>
        
        <!-- Botón manual por si el bucle falla o se quiere forzar -->
        <q-btn 
          v-if="!isInitializing && !isProcessing" 
          color="amber" 
          text-color="black" 
          icon="camera" 
          label="Capturar Manualmente" 
          class="full-width q-mt-md" 
          @click="captureFrameAndAnalyze" 
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useOcrScanner } from '~/composables/shared/useOcrScanner'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'onDetect', text: string): void
}>()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    startCamera()
  } else {
    stopCamera()
  }
})
watch(isOpen, (val) => emit('update:modelValue', val))

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null
let scanInterval: ReturnType<typeof setInterval> | null = null

const { 
  initWorker, 
  recognizeText, 
  isInitializing, 
  isProcessing, 
  initializationProgress, 
  error,
  terminateWorker
} = useOcrScanner()

const startCamera = async () => {
  try {
    // Inicializar el OCR en paralelo
    initWorker()

    // Solicitar cámara trasera (environment)
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    })
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      // Iniciar el bucle de escaneo automático cada 2.5 segundos
      scanInterval = setInterval(captureFrameAndAnalyze, 2500)
    }
  } catch (err) {
    console.error('Error accediendo a la cámara:', err)
    error.value = 'No se pudo acceder a la cámara. Revise los permisos.'
  }
}

const stopCamera = () => {
  if (scanInterval) clearInterval(scanInterval)
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (videoRef.value) videoRef.value.srcObject = null
  terminateWorker() // Libera la memoria del OCR
}

const captureFrameAndAnalyze = async () => {
  if (!videoRef.value || !canvasRef.value || isInitializing.value || isProcessing.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')
  if (!context) return

  // Ajustar tamaño del canvas al tamaño del video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Dibujar el fotograma actual en el canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Extraer el texto
  const text = await recognizeText(canvas)
  
  if (text && text.length > 3) {
    // Limpiamos texto basura
    const cleanText = text.replace(/[\n\r]/g, ' ').trim()
    console.log('[OCR Detectado]:', cleanText)
    
    // Opcional: Emitir si cumple un criterio, aquí emitiremos siempre que haya al menos 3 letras
    emit('onDetect', cleanText)
    
    // Si queremos que se cierre automáticamente al detectar algo válido (descomentar si se desea):
    // isOpen.value = false
  }
}

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<style scoped>
.ocr-target-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 400px;
  height: 150px;
  border: 3px dashed #ffc107;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6); /* Oscurece todo el exterior de la caja */
  pointer-events: none;
}
</style>
