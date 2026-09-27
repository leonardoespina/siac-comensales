import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDiningRoomsStore } from '~/stores/diningRooms'

export function useDiningRoomForm() {
  const store = useDiningRoomsStore()
  const $q = useQuasar()
  
  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const isTestingDevice = ref(false)
  const deviceTestResult = ref<any>(null)

  const form = ref({
    id: 0,
    name: '',
    siteId: null as number | null,
    active: true,
    deviceIp: '',
    devicePort: 443,
    deviceUser: 'admin',
    devicePassword: '',
    deviceEnabled: true
  })

  const resetForm = () => {
    form.value = {
      id: 0,
      name: '',
      siteId: null,
      active: true,
      deviceIp: '',
      devicePort: 443,
      deviceUser: 'admin',
      devicePassword: '',
      deviceEnabled: true
    }
    deviceTestResult.value = null
  }

  const openCreate = () => {
    resetForm()
    isEditing.value = false
    isDialogOpen.value = true
  }

  const openEdit = (row: any) => {
    form.value = { 
      id: row.id,
      name: row.name,
      siteId: row.siteId ?? row.site?.id ?? null,
      active: row.active,
      deviceIp: row.deviceIp || '',
      devicePort: row.devicePort || 443,
      deviceUser: row.deviceUser || 'admin',
      devicePassword: row.devicePassword || '',
      deviceEnabled: row.deviceEnabled !== false
    }
    deviceTestResult.value = null
    isEditing.value = true
    isDialogOpen.value = true
  }

  const testDeviceConnection = async () => {
    if (!form.value.deviceIp) {
      $q.notify({ type: 'warning', message: 'Ingrese una dirección IP para probar.' })
      return
    }

    isTestingDevice.value = true
    deviceTestResult.value = null

    try {
      const res = await $fetch<{ success: boolean; message: string; device: any }>('/api/dining-rooms/test-device', {
        method: 'POST',
        body: {
          deviceIp: form.value.deviceIp,
          devicePort: form.value.devicePort,
          deviceUser: form.value.deviceUser,
          devicePassword: form.value.devicePassword
        }
      })

      deviceTestResult.value = res.device
      $q.notify({
        type: 'positive',
        message: `Conexión Exitosa: ${res.device.model} (Firmware: ${res.device.firmware})`,
        icon: 'check_circle'
      })
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Error al conectar con el dispositivo'
      $q.notify({
        type: 'negative',
        message: msg,
        icon: 'error'
      })
    } finally {
      isTestingDevice.value = false
    }
  }

  const submit = async () => {
    try {
      if (isEditing.value) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Comedor actualizado exitosamente' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Comedor creado exitosamente' })
      }
      isDialogOpen.value = false
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al guardar el comedor' })
    }
  }

  const remove = (id: number) => {
    $q.dialog({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas desactivar este comedor?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Comedor desactivado' })
      } catch (e: any) {
        $q.notify({ type: 'negative', message: 'Error al desactivar el comedor' })
      }
    })
  }

  return {
    isDialogOpen,
    isEditing,
    isTestingDevice,
    deviceTestResult,
    form,
    openCreate,
    openEdit,
    testDeviceConnection,
    submit,
    remove
  }
}
