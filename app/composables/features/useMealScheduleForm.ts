import { ref } from 'vue'
import { useMealSchedulesStore } from '~/stores/mealSchedules'
import { useNotifications } from '~/composables/core/useNotifications'

export function useMealScheduleForm() {
  const store = useMealSchedulesStore()
  const { notify } = useNotifications()

  const isOpen = ref(false)
  const isEditing = ref(false)
  const loading = ref(false)
  const currentId = ref<number | null>(null)

  // El modelo por defecto debe usar el formato de 24 horas (HH:mm) para que Quasar QTime y el backend lo entiendan.
  // El AM/PM se controla puramente a nivel visual en el componente Vue sin alterar el valor interno.
  const form = ref({
    shiftType: '',
    startTime: '06:00',
    endTime: '08:00',
    active: true
  })

  function resetForm() {
    form.value = {
      shiftType: '',
      startTime: '06:00',
      endTime: '08:00',
      active: true
    }
    isEditing.value = false
    currentId.value = null
  }

  function openCreate() {
    resetForm()
    isOpen.value = true
  }

  function openEdit(schedule: any) {
    resetForm()
    isEditing.value = true
    currentId.value = schedule.id
    form.value = {
      shiftType: schedule.shiftType,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      active: schedule.active
    }
    isOpen.value = true
  }

  async function submit() {
    loading.value = true
    try {
      if (isEditing.value && currentId.value) {
        // Edit flow
        await store.updateSchedule(currentId.value, {
          startTime: form.value.startTime,
          endTime: form.value.endTime,
          active: form.value.active
        })
        notify.success('Horario actualizado correctamente')
      } else {
        // Create flow
        await store.addSchedule(form.value)
        notify.success('Horario creado correctamente')
      }
      isOpen.value = false
    } catch (e: any) {
      // Mostrar el error real de solapamiento del backend ("Tu horario colisiona...")
      notify.error(e.data?.statusMessage || 'Ocurrió un error al procesar el horario')
    } finally {
      loading.value = false
    }
  }

  return {
    isOpen,
    isEditing,
    loading,
    form,
    openCreate,
    openEdit,
    submit
  }
}
