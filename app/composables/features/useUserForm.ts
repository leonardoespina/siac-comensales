import { ref } from 'vue'
import { useUsersStore } from '~/stores/users'
import { useDependenciesStore } from '~/stores/dependencies'
import { useNotifications } from '~/composables/core/useNotifications'

export function useUserForm() {
  const store = useUsersStore()
  const { notify } = useNotifications()
  
  const isOpen = ref(false)
  const isEditing = ref(false)
  const loading = ref(false)
  
  const form = ref({
    id: 0,
    cedula: '',
    name: '',
    password: '',
    roleId: null as number | null,

    dependencyId: null as number | null,
    subdependencyId: null as number | null,
    siteIds: [] as number[],
    active: true
  })

  function openCreate() {
    isEditing.value = false
    form.value = { id: 0, cedula: '', name: '', password: '', roleId: null, dependencyId: null, subdependencyId: null, siteIds: [], active: true }
    isOpen.value = true
  }

  function openEdit(user: any) {
    isEditing.value = true
    
    // Find dependencyId if user has subdependencyId (for normal users)
    // For Gerentes, user.dependencyId is already provided by the backend
    let depId = user.dependencyId || null
    if (!depId && user.subdependencyId) {
      const depStore = useDependenciesStore()
      for (const dep of depStore.dependencies) {
        if (dep.subdependencies?.some((sub: any) => sub.id === user.subdependencyId)) {
          depId = dep.id
          break
        }
      }
    }
    
    const siteIds = user.sites?.map((s: any) => s.id) || []
    form.value = { ...user, dependencyId: depId, siteIds, password: '' }
    isOpen.value = true
  }

  async function submit() {
    loading.value = true
    try {
      if (isEditing.value) {
        await store.updateUser(form.value.id, form.value)
        notify.success('Usuario actualizado correctamente')
      } else {
        await store.createUser(form.value)
        notify.success('Usuario creado. Su contraseña por defecto es: 123456')
      }
      isOpen.value = false
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al guardar el usuario')
    } finally {
      loading.value = false
    }
  }

  return { isOpen, isEditing, loading, form, openCreate, openEdit, submit }
}
