import { ref, onBeforeUnmount } from 'vue'
import { createWorker, type Worker } from 'tesseract.js'

export function useOcrScanner() {
  const isInitializing = ref(false)
  const isProcessing = ref(false)
  const initializationProgress = ref(0)
  const error = ref<string | null>(null)
  
  // Guardamos la referencia del worker en memoria
  let worker: Worker | null = null

  /**
   * Inicializa el Worker de Tesseract de forma diferida.
   * Descarga el modelo de español (spa) si no está en caché.
   */
  const initWorker = async () => {
    if (worker) return // Ya está inicializado
    
    try {
      isInitializing.value = true
      error.value = null
      
      worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' || m.status === 'loading tesseract core') {
            initializationProgress.value = Math.round(m.progress * 100)
          }
        }
      })
      
      isInitializing.value = false
    } catch (e: any) {
      console.error('Error al inicializar Tesseract:', e)
      error.value = 'Error al cargar el motor OCR. Intente nuevamente.'
      isInitializing.value = false
    }
  }

  /**
   * Extrae el texto de un elemento (Canvas, Image, Video o URL).
   */
  const recognizeText = async (imageLike: any): Promise<string | null> => {
    if (!worker) {
      await initWorker()
    }
    
    if (!worker) return null // Falló la inicialización

    try {
      isProcessing.value = true
      const { data: { text } } = await worker.recognize(imageLike)
      return text.trim()
    } catch (e) {
      console.error('Error procesando imagen OCR:', e)
      return null
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Limpia la memoria destruyendo el Web Worker. 
   * Vital para SPAs y dispositivos móviles.
   */
  const terminateWorker = async () => {
    if (worker) {
      await worker.terminate()
      worker = null
    }
  }

  // Si el componente que usa este composable se destruye, limpiamos memoria automáticamente
  onBeforeUnmount(() => {
    terminateWorker()
  })

  return {
    isInitializing,
    isProcessing,
    initializationProgress,
    error,
    initWorker,
    recognizeText,
    terminateWorker
  }
}
