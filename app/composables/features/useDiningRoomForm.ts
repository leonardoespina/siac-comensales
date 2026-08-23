import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDiningRoomsStore } from '~/stores/diningRooms'

export function useDiningRoomForm() {
  const store = useDiningRoomsStore()
  const $q = useQuasar()
  
  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref({
    id: 0,
    name: '',
    siteId: null as number | null,
    active: true
  })

  const resetForm = () => {
    form.value = {
      id: 0,
      name: '',
      siteId: null,
      active: true
    }
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
      active: row.active 
    }
    isEditing.value = true
    isDialogOpen.value = true
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
    form,
    openCreate,
    openEdit,
    submit,
    remove
  }
}
