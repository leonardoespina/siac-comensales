import { ref, readonly } from 'vue'

export function useBiometricScanner() {
  const isScanning = ref(false)
  const isSuccess = ref(false)
  const isError = ref(false)
  const errorMessage = ref('')
  
  // Emula la comunicación con un hardware lector de huellas vía SDK
  const scanFingerprint = (): Promise<string> => {
    isScanning.value = true
    isSuccess.value = false
    isError.value = false
    errorMessage.value = ''
    
    return new Promise((resolve, reject) => {
      // Simular retraso de lectura del dispositivo (1.5 a 3 segundos)
      setTimeout(() => {
        isScanning.value = false
        // 90% de éxito en la lectura simulada
        if (Math.random() > 0.1) {
          isSuccess.value = true
          // Generar un hash falso único (simulando una plantilla dactilar Minutiae)
          const fakeHash = `FPRNT-${crypto.randomUUID().split('-')[0].toUpperCase()}`
          resolve(fakeHash)
        } else {
          isError.value = true
          errorMessage.value = 'Huella irreconocible o sensor sucio. Intente de nuevo.'
          reject(new Error(errorMessage.value))
        }
      }, 1500 + Math.random() * 1500)
    })
  }

  const reset = () => {
    isScanning.value = false
    isSuccess.value = false
    isError.value = false
    errorMessage.value = ''
  }

  return {
    isScanning: readonly(isScanning),
    isSuccess: readonly(isSuccess),
    isError: readonly(isError),
    errorMessage: readonly(errorMessage),
    scanFingerprint,
    reset
  }
}
