import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useSitesStore } from '~/stores/sites'

export function useSiteForm() {
  const store = useSitesStore()
  const $q = useQuasar()
  
  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref({
    id: 0,
    name: '',
    description: '',
    active: true
  })

  const resetForm = () => {
    form.value = {
      id: 0,
      name: '',
      description: '',
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
      description: row.description || '',
      active: row.active 
    }
    isEditing.value = true
    isDialogOpen.value = true
  }

  const submit = async () => {
    try {
      if (isEditing.value) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Sede actualizada exitosamente' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Sede creada exitosamente' })
      }
      isDialogOpen.value = false
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al guardar la sede' })
    }
  }

  const remove = (id: number) => {
    $q.dialog({
      title: 'Confirmar Acción',
      message: '¿Estás seguro de que deseas desactivar esta sede?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Sede desactivada exitosamente' })
      } catch (e: any) {
        $q.notify({ type: 'negative', message: 'Error al desactivar la sede' })
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
