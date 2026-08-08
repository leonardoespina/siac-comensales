import { ref } from 'vue'
import { usePositionsStore } from '~/stores/positions'
import { useNotifications } from '~/composables/core/useNotifications'

export function usePositionForm() {
  const store = usePositionsStore()
  const { notify } = useNotifications()
  
  const isOpen = ref(false)
  const isEditing = ref(false)
  const loading = ref(false)
  
  const form = ref({
    id: 0,
    name: '',
    active: true
  })

  function openCreate() {
    isEditing.value = false
    form.value = { id: 0, name: '', active: true }
    isOpen.value = true
  }

  function openEdit(position: any) {
    isEditing.value = true
    form.value = { ...position }
    isOpen.value = true
  }

  async function submit() {
    if (!form.value.name.trim()) {
      notify.error('El nombre del cargo es obligatorio')
      return
    }

    loading.value = true
    try {
      if (isEditing.value) {
        await store.updatePosition(form.value.id, form.value)
        notify.success('Cargo actualizado exitosamente')
      } else {
        await store.createPosition(form.value)
        notify.success('Cargo creado exitosamente')
      }
      isOpen.value = false
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al guardar el cargo')
    } finally {
      loading.value = false
    }
  }

  return { isOpen, isEditing, loading, form, openCreate, openEdit, submit }
}
