import { ref } from 'vue'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'

export function useWorkerForm() {
  const dinersStore = useDinersStore()
  const depStore = useDependenciesStore()
  const authStore = useAuthStore()
  const $q = useQuasar()

  const showDialog = ref(false)
  const isEdit = ref(false)
  const editId = ref<number | null>(null)

  const formData = ref({
    cedula: '',
    name: '',
    rationType: 'NORMAL',
    squadId: null as number | null,
    dependencyId: null as number | null,
    subdependencyId: null as number | null,
    positionId: null as number | null,
    diningRoomId: null as number | null
  })

  function openDialog() {
    isEdit.value = false
    editId.value = null
    formData.value = {
      cedula: '',
      name: '',
      rationType: 'NORMAL',
      squadId: null,
      dependencyId: null,
      subdependencyId: authStore.user?.subdependencyId || null,
      positionId: null,
      diningRoomId: null
    }
    showDialog.value = true
  }

  function openEditDialog(diner: any) {
    isEdit.value = true
    editId.value = diner.id

    // Auto-detectar la dependencia basada en la subdependencia del diner
    // Soluciona el Bug del Administrador Global mostrando el ID numérico
    let depId = null
    if (diner.subdependencyId) {
      for (const dep of depStore.dependencies) {
        if (dep.subdependencies?.some(sub => sub.id === diner.subdependencyId)) {
          depId = dep.id
          break
        }
      }
    }

    formData.value = {
      cedula: diner.cedula,
      name: diner.name,
      rationType: diner.rationType,
      squadId: diner.squadId,
      dependencyId: depId,
      subdependencyId: diner.subdependencyId,
      positionId: diner.positionId,
      diningRoomId: diner.diningRoomId
    }
    showDialog.value = true
  }

  async function submit() {
    if (!formData.value.cedula || !formData.value.name || !formData.value.squadId) {
      $q.notify({ type: 'warning', message: 'Llene todos los campos requeridos.' })
      return
    }
    
    if (!formData.value.diningRoomId) {
      $q.notify({ type: 'warning', message: 'Debes seleccionar el comedor asignado.' })
      return
    }

    if (authStore.hasPermission('GLOBAL_ACCESS', 'canRead') && !authStore.user?.subdependencyId && !formData.value.subdependencyId) {
      $q.notify({ type: 'warning', message: 'Como Administrador Global, debes seleccionar a qué subdependencia pertenecerá el trabajador.' })
      return
    }

    try {
      if (isEdit.value && editId.value) {
        await dinersStore.updateDiner(editId.value, {
          cedula: formData.value.cedula,
          name: formData.value.name,
          rationType: formData.value.rationType,
          squadId: formData.value.squadId!,
          subdependencyId: formData.value.subdependencyId,
          positionId: formData.value.positionId,
          diningRoomId: formData.value.diningRoomId
        })
        $q.notify({ type: 'positive', message: 'Comensal actualizado exitosamente' })
      } else {
        // En lugar de usar $fetch, delegamos al store de Pinia como manda la regla
        await dinersStore.registerDiner(
          formData.value.cedula,
          formData.value.name,
          formData.value.rationType,
          formData.value.squadId!,
          formData.value.subdependencyId,
          formData.value.positionId,
          formData.value.diningRoomId
        )
        $q.notify({ type: 'positive', message: 'Comensal registrado exitosamente' })
      }

      showDialog.value = false
      formData.value.cedula = ''
      formData.value.name = ''
      formData.value.squadId = null
      formData.value.subdependencyId = null
      formData.value.positionId = null
      formData.value.diningRoomId = null
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al registrar comensal' })
    }
  }

  return { showDialog, isEdit, formData, openDialog, openEditDialog, submit }
}
