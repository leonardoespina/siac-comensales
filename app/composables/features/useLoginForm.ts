import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/core/useNotifications'

export function useLoginForm() {
  const auth = useAuthStore()
  const { notify } = useNotifications()
  
  const cedula = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const loading = ref(false) // Este lo mantenemos para el spinner del botón

  async function submit() {
    loading.value = true
    
    try {
      // Toda la lógica de negocio y llamadas a API delegan al Store
      await auth.login(cedula.value, password.value)
      notify.success('¡Bienvenido al sistema!')
      navigateTo('/')
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al iniciar sesión')
    } finally {
      loading.value = false
    }
  }

  return {
    cedula,
    password,
    showPassword,
    loading,
    submit
  }
}
