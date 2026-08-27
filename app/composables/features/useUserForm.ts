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
    subdependencyIds: [] as number[],
    siteIds: [] as number[],
    active: true
  })

  function openCreate() {
    isEditing.value = false
    form.value = {
      id: 0,
      cedula: '',
      name: '',
      password: '',
      roleId: null,
      dependencyId: null,
      subdependencyIds: [],
      siteIds: [],
      active: true
    }
    isOpen.value = true
  }

  function openEdit(user: any) {
    isEditing.value = true
    
    // Extraer IDs de subdependencias (M:N o legacy subdependencyId)
    const subdependencyIds: number[] = user.subdependencies?.length
      ? user.subdependencies.map((s: any) => s.id)
      : (user.subdependencyId ? [user.subdependencyId] : [])

    // Buscar dependencyId si no viene explícito
    let depId = user.dependencyId || null
    if (!depId && subdependencyIds.length > 0) {
      const depStore = useDependenciesStore()
      for (const dep of depStore.dependencies) {
        if (dep.subdependencies?.some((sub: any) => subdependencyIds.includes(sub.id))) {
          depId = dep.id
          break
        }
      }
    }
    
    const siteIds = user.sites?.map((s: any) => s.id) || []
    form.value = { 
      ...user, 
      dependencyId: depId, 
      subdependencyIds, 
      siteIds, 
      password: '' 
    }
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
