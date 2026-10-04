/**
 * COMPOSABLE: Captura y Enrolamiento Facial en Pantalla del Terminal Hikvision
 * 
 * RESPONSABILIDAD:
 * - Orquestar la activación de la pantalla interactiva del biométrico por hardware.
 * - Retorna estado envuelto en readonly() conforme a AGENTS.md.
 */

import { ref, readonly, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useBiometricsStore } from '~/stores/biometrics'
import { useDiningRoomsStore } from '~/stores/diningRooms'

const STORAGE_KEY_ROOM = 'siac_last_biometric_room_id'

export function useBiometricCameraCapture() {
  const $q = useQuasar()
  const biometricsStore = useBiometricsStore()
  const diningRoomsStore = useDiningRoomsStore()

  const selectedDiningRoomId = ref<number | null>(null)
  const isDeviceCapturing = ref<boolean>(false)

  // Comedores activos con terminal biométrico habilitado
  const availableTerminals = computed(() => {
    return diningRoomsStore.diningRooms.filter(dr => dr.active && dr.deviceIp && dr.deviceEnabled)
  })

  onMounted(async () => {
    if (diningRoomsStore.diningRooms.length === 0) {
      await diningRoomsStore.fetchAll()
    }

    const savedId = localStorage.getItem(STORAGE_KEY_ROOM)
    if (savedId) {
      const parsed = parseInt(savedId, 10)
      if (availableTerminals.value.some(t => t.id === parsed)) {
        selectedDiningRoomId.value = parsed
      }
    }

    if (!selectedDiningRoomId.value && availableTerminals.value.length > 0) {
      selectedDiningRoomId.value = availableTerminals.value[0].id
    }
  })

  function selectDiningRoom(id: number) {
    selectedDiningRoomId.value = id
    localStorage.setItem(STORAGE_KEY_ROOM, String(id))
  }

  /**
   * Captura directa e instantánea desde la pantalla táctil física del terminal MinMoe
   */
  async function captureDirectFromDevice(cedula: string): Promise<{ success: boolean; photoUrl?: string }> {
    if (!selectedDiningRoomId.value) {
      $q.notify({ type: 'warning', message: 'Debe seleccionar un terminal activo', position: 'top' })
      return { success: false }
    }

    if (!cedula) {
      $q.notify({ type: 'warning', message: 'Cédula no proporcionada', position: 'top' })
      return { success: false }
    }

    isDeviceCapturing.value = true
    const notif = $q.notify({
      type: 'info',
      message: '📸 Terminal activo: El comensal debe mirar la pantalla del biométrico y presionar el botón de captura.',
      icon: 'camera_front',
      position: 'top',
      timeout: 30000,
      spinner: true
    })

    try {
      const result = await biometricsStore.triggerInteractiveCapture(selectedDiningRoomId.value, cedula)
      notif()

      $q.notify({
        type: 'positive',
        message: `¡Rostro capturado y enrolado con éxito para ${result.name || cedula}!`,
        icon: 'check_circle',
        position: 'top'
      })

      return { success: true, photoUrl: result.photoUrl }
    } catch (err: any) {
      notif()
      $q.notify({
        type: 'negative',
        message: `Error en captura del terminal: ${err?.data?.message || err?.message || 'Tiempo de espera agotado'}`,
        position: 'top'
      })
      return { success: false }
    } finally {
      isDeviceCapturing.value = false
    }
  }

  return {
    // Estado reactivo (readonly)
    selectedDiningRoomId: readonly(selectedDiningRoomId),
    isDeviceCapturing: readonly(isDeviceCapturing),
    availableTerminals,

    // Acciones
    selectDiningRoom,
    captureDirectFromDevice
  }
}
