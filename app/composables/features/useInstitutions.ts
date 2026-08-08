import { ref } from 'vue'
import { useQuasar } from 'quasar'

export function useInstitutions() {
  const $q = useQuasar()
  const loading = ref(false)
  const saving = ref(false)
  const institutions = ref<any[]>([])

  const fetchInstitutions = async () => {
    loading.value = true
    try {
      institutions.value = await $fetch('/api/institutions')
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al cargar instituciones' })
    } finally {
      loading.value = false
    }
  }

  const saveInstitution = async (id: number | null, data: any) => {
    saving.value = true
    try {
      if (id) {
        await $fetch(`/api/institutions/${id}`, { method: 'PUT', body: data })
      } else {
        await $fetch('/api/institutions', { method: 'POST', body: data })
      }
      await fetchInstitutions()
      $q.notify({ type: 'positive', message: 'Institución guardada correctamente' })
      return true
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al guardar' })
      return false
    } finally {
      saving.value = false
    }
  }

  const deleteInstitution = async (id: number) => {
    try {
      await $fetch(`/api/institutions/${id}`, { method: 'DELETE' })
      await fetchInstitutions()
      $q.notify({ type: 'positive', message: 'Institución eliminada' })
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar' })
    }
  }

  return {
    loading, saving, institutions, fetchInstitutions, saveInstitution, deleteInstitution
  }
}
