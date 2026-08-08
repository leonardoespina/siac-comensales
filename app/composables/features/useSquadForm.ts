import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useSquadsStore } from '~/stores/squads'

export function useSquadForm() {
  const $q = useQuasar()
  const squadsStore = useSquadsStore()

  const showSquadDialog = ref(false)
  const isEditingSquad = ref(false)
  const squadId = ref<number | null>(null)
  const squadName = ref('')

  const openCreateSquad = () => {
    isEditingSquad.value = false
    squadId.value = null
    squadName.value = ''
    showSquadDialog.value = true
  }

  const openEditSquad = (squad: any) => {
    isEditingSquad.value = true
    squadId.value = squad.id
    squadName.value = squad.name
    showSquadDialog.value = true
  }

  const submitSquad = async () => {
    if (!squadName.value) return
    try {
      if (isEditingSquad.value && squadId.value) {
        await squadsStore.updateSquad(squadId.value, squadName.value)
        $q.notify({ type: 'positive', message: 'Cuadrilla actualizada exitosamente' })
      } else {
        await squadsStore.createSquad(squadName.value)
        $q.notify({ type: 'positive', message: 'Cuadrilla creada exitosamente' })
      }
      showSquadDialog.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar la cuadrilla' })
    }
  }

  const confirmDeleteSquad = (id: number, name: string) => {
    $q.dialog({
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de desactivar la cuadrilla "${name}" del catálogo global?`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await squadsStore.deleteSquad(id)
        $q.notify({ type: 'positive', message: 'Cuadrilla desactivada' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
      }
    })
  }

  return {
    showSquadDialog,
    isEditingSquad,
    squadId,
    squadName,
    openCreateSquad,
    openEditSquad,
    submitSquad,
    confirmDeleteSquad
  }
}
