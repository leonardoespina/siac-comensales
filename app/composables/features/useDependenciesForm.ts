import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDependenciesStore } from '~/stores/dependencies'

export function useDependenciesForm() {
  const $q = useQuasar()
  const store = useDependenciesStore()

  // Estado Modal Dependencia Principal
  const showDepDialog = ref(false)
  const isEditingDep = ref(false)
  const depId = ref<number | null>(null)
  const depName = ref('')

  // Estado Modal Subdependencia
  const showSubDialog = ref(false)
  const isEditingSub = ref(false)
  const formDataSub = ref({
    id: null as number | null,
    name: '',
    dependencyId: null as number | null
  })

  // Búsqueda
  const filterText = ref('')

  const openCreateDep = () => {
    isEditingDep.value = false
    depId.value = null
    depName.value = ''
    showDepDialog.value = true
  }

  const openEditDep = (dep: any) => {
    isEditingDep.value = true
    depId.value = dep.id
    depName.value = dep.name
    showDepDialog.value = true
  }

  const openCreateSub = () => {
    isEditingSub.value = false
    formDataSub.value = { id: null, name: '', dependencyId: null }
    showSubDialog.value = true
  }

  const openEditSub = (sub: any) => {
    isEditingSub.value = true
    formDataSub.value = { id: sub.id, name: sub.name, dependencyId: sub.dependencyId }
    showSubDialog.value = true
  }

  const submitDependency = async () => {
    if (!depName.value) return
    try {
      if (isEditingDep.value && depId.value) {
        await store.updateDependency(depId.value, depName.value)
        $q.notify({ type: 'positive', message: 'Dependencia actualizada' })
      } else {
        await store.createDependency(depName.value)
        $q.notify({ type: 'positive', message: 'Dependencia creada' })
      }
      showDepDialog.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar dependencia' })
    }
  }

  const submitSubdependency = async () => {
    if (!formDataSub.value.name || !formDataSub.value.dependencyId) return
    try {
      if (isEditingSub.value && formDataSub.value.id) {
        await store.updateSubdependency(formDataSub.value.id, formDataSub.value.dependencyId, formDataSub.value.name)
        $q.notify({ type: 'positive', message: 'Subdependencia actualizada' })
      } else {
        await store.createSubdependency(formDataSub.value.dependencyId, formDataSub.value.name)
        $q.notify({ type: 'positive', message: 'Subdependencia creada' })
      }
      showSubDialog.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar subdependencia' })
    }
  }

  const confirmDeleteDep = (id: number, name: string) => {
    $q.dialog({
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de eliminar la dependencia "${name}"? Esto podría afectar las subdependencias.`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.deleteDependency(id)
        $q.notify({ type: 'positive', message: 'Dependencia eliminada' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
      }
    })
  }

  const confirmDeleteSub = (id: number, name: string) => {
    $q.dialog({
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de desactivar la subdependencia "${name}"?`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.deleteSubdependency(id)
        $q.notify({ type: 'positive', message: 'Subdependencia desactivada' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
      }
    })
  }

  return {
    showDepDialog,
    isEditingDep,
    depId,
    depName,
    showSubDialog,
    isEditingSub,
    formDataSub,
    filterText,
    openCreateDep,
    openEditDep,
    openCreateSub,
    openEditSub,
    submitDependency,
    submitSubdependency,
    confirmDeleteDep,
    confirmDeleteSub
  }
}
