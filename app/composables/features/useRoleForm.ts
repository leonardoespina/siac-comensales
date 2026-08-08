import { ref } from 'vue'
import { useRolesStore } from '~/stores/roles'
import { useNotifications } from '~/composables/core/useNotifications'

export function useRoleForm() {
  const store = useRolesStore()
  const { notify } = useNotifications()
  
  const isOpen = ref(false)
  const isEditing = ref(false)
  const loading = ref(false)
  
  const form = ref({
    id: 0,
    name: '',
    description: '',
    permissions: [] as any[]
  })

  function openCreate() {
    isEditing.value = false
    // Pre-poblar los permisos en falso para todos los módulos existentes
    form.value = { 
      id: 0, 
      name: '', 
      description: '', 
      permissions: store.modules.map(m => ({ moduleId: m.id, canCreate: false, canRead: false, canUpdate: false, canDelete: false }))
    }
    isOpen.value = true
  }

  function openEdit(role: any) {
    isEditing.value = true
    
    // Mezclar módulos existentes con los permisos que ya tiene el rol
    const mergedPermissions = store.modules.map(m => {
      const existingPerm = role.permissions?.find((p: any) => p.moduleId === m.id)
      return existingPerm ? { ...existingPerm } : { moduleId: m.id, canCreate: false, canRead: false, canUpdate: false, canDelete: false }
    })

    form.value = { ...role, permissions: mergedPermissions }
    isOpen.value = true
  }

  async function submit() {
    loading.value = true
    try {
      if (isEditing.value) {
        await store.updateRole(form.value.id, form.value)
        notify.success('Rol actualizado con su matriz de permisos')
      } else {
        await store.createRole(form.value)
        notify.success('Rol creado exitosamente')
      }
      isOpen.value = false
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al guardar el rol')
    } finally {
      loading.value = false
    }
  }

  return { isOpen, isEditing, loading, form, openCreate, openEdit, submit }
}
