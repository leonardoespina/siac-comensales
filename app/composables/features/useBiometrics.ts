import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'

export function useBiometrics() {
  const $q = useQuasar()
  const LOCAL_BIO_API = 'http://localhost:8081/api'
  
  const isReaderConnected = ref(false)
  const isCapturing = ref(false)
  const isVerifying = ref(false)
  
  let statusInterval: any = null
  let abortController: AbortController | null = null

  // ── MONITOREO DE ESTADO ──────────────────────────────────────────────────
  const checkStatus = async () => {
    try {
      await $fetch(`${LOCAL_BIO_API}/status`, { timeout: 2000 })
      isReaderConnected.value = true
    } catch (e) {
      isReaderConnected.value = false
    }
  }

  const startMonitoring = () => {
    checkStatus()
    statusInterval = setInterval(checkStatus, 5000)
  }

  const stopMonitoring = () => {
    if (statusInterval) clearInterval(statusInterval)
  }

  // ── ENROLAMIENTO (4 TOQUES) ──────────────────────────────────────────────
  const enrollmentSamples = ref<string[]>([])
  
  const enrollFingerprint = async (): Promise<string | null> => {
    if (isCapturing.value) return null
    if (!isReaderConnected.value) {
      $q.notify({ type: 'negative', message: 'Lector biométrico no conectado.' })
      return null
    }

    isCapturing.value = true
    enrollmentSamples.value = []
    abortController = new AbortController()
    
    try {
      while (enrollmentSamples.value.length < 4) {
        let fmd: string | null = null

        if (enrollmentSamples.value.length === 0) {
          // Paso 1: Captura inicial ciega
          const res = await $fetch<any>(`${LOCAL_BIO_API}/capture`, { signal: abortController.signal })
          if (res.success && res.fmdBase64) {
             fmd = res.fmdBase64
          } else {
             $q.notify({ type: 'warning', message: res.message || 'Error en captura. Reintentando...', timeout: 2000 })
             await new Promise(resolve => setTimeout(resolve, 1500))
             continue
          }
        } else {
          // Pasos 2, 3, 4: Verificación contra la primera huella
          const res = await $fetch<any>(`${LOCAL_BIO_API}/verify`, {
            method: 'POST',
            body: { templates: [enrollmentSamples.value[0]] },
            signal: abortController.signal
          })
          if (res.success) {
            if (res.match && res.fmdBase64) {
              fmd = res.fmdBase64
            } else {
              $q.notify({ type: 'warning', message: res.message || 'Huella distinta detectada. Use el mismo dedo.', timeout: 3000 })
              await new Promise(resolve => setTimeout(resolve, 1500))
              continue // Reintentar captura sin avanzar
            }
          } else {
            $q.notify({ type: 'warning', message: res.message || 'Error validando captura. Reintentando...', timeout: 2000 })
            await new Promise(resolve => setTimeout(resolve, 1500))
            continue
          }
        }

        if (fmd) {
          enrollmentSamples.value.push(fmd)
          if (enrollmentSamples.value.length < 4) {
             // Pequeña pausa para que levante el dedo
             await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      // Fusión Final (Paso 5)
      const resEnroll = await $fetch<any>(`${LOCAL_BIO_API}/enroll`, {
        method: 'POST',
        body: { templates: enrollmentSamples.value },
        signal: abortController.signal
      })

      if (resEnroll.success && resEnroll.fmdBase64) {
        $q.notify({ type: 'positive', message: 'Plantilla de huella generada exitosamente' })
        return resEnroll.fmdBase64
      } else {
        throw new Error(resEnroll.message || 'Error al fusionar huellas')
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || err.statusCode === 499) {
        console.log('Enrolamiento cancelado')
      } else {
        $q.notify({ type: 'negative', message: err.data?.message || err.message || 'El enrolamiento falló.' })
      }
      return null
    } finally {
      isCapturing.value = false
      abortController = null
    }
  }

  // ── VERIFICACIÓN DE HUELLA (DESPACHO/LOGIN) ───────────────────────────────
  const verifyFingerprint = async (candidateTemplates: string[]): Promise<number | null> => {
    if (isVerifying.value) return null
    if (!isReaderConnected.value) {
      $q.notify({ type: 'negative', message: 'Lector biométrico desconectado.' })
      return null
    }
    if (!candidateTemplates || candidateTemplates.length === 0) {
      $q.notify({ type: 'warning', message: 'No hay huellas para comparar.' })
      return null
    }

    isVerifying.value = true
    abortController = new AbortController()

    try {
      const response = await $fetch<any>(`${LOCAL_BIO_API}/verify`, {
        method: 'POST',
        body: { templates: candidateTemplates },
        signal: abortController.signal
      })

      if (response.success && response.match) {
        return response.matchedIndex !== undefined ? response.matchedIndex : 0
      } else {
        const errorMsg = response.message || 'La huella no coincide.'
        $q.notify({ type: 'warning', message: errorMsg, position: 'bottom' })
        return null
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.statusCode === 499 || err.message?.includes('aborted')) {
        console.log('Verificación cancelada por el usuario')
      } else {
        $q.notify({ type: 'negative', message: err.data?.message || err.message || 'Error en validación biométrica.' })
      }
      return null
    } finally {
      isVerifying.value = false
      abortController = null
    }
  }

  const cancelOperation = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isCapturing.value = false
    isVerifying.value = false
  }

  // ── LÓGICA DE UI (Movida desde el componente para mantenerlo delgado) ──
  const getUiState = (mode: string, savedCount: number = 0) => {
    const iconColor = computed(() => {
      if (!isReaderConnected.value) return 'grey-6'
      if (isCapturing.value || isVerifying.value) return 'primary'
      if (savedCount > 0) return 'positive'
      return 'grey-5'
    })

    const statusTitle = computed(() => {
      if (!isReaderConnected.value) return 'Lector Apagado'
      if (isCapturing.value) return 'Esperando Huella...'
      if (isVerifying.value) return 'Validando Identidad...'
      if (mode === 'ENROLL') return savedCount > 0 ? 'Huella Guardada' : 'Listo para Captura'
      return 'Listo para Validar'
    })

    const statusDescription = computed(() => {
      if (!isReaderConnected.value) return 'Conecte el U.are.U 5160 y verifique el middleware'
      if (isCapturing.value || isVerifying.value) return 'Coloque su dedo firmemente sobre el cristal'
      if (mode === 'ENROLL') return 'Haga clic para registrar una nueva huella'
      return 'Haga clic para iniciar la validación'
    })

    return { iconColor, statusTitle, statusDescription }
  }

  return {
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
  }
}
