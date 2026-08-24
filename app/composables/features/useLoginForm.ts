import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/core/useNotifications'

export function useLoginForm() {
  const auth = useAuthStore()
  const { notify } = useNotifications()
  const $q = useQuasar()
  
  const cedula = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const loading = ref(false)

  async function performLogin(force = false) {
    loading.value = true
    
    try {
      await auth.login(cedula.value, password.value, force)
      notify.success('¡Bienvenido al sistema!')
      navigateTo('/')
    } catch (error: any) {
      if (error.statusCode === 409 || error.data?.data?.code === 'ACTIVE_SESSION_EXISTS') {
        $q.dialog({
          title: '⚠️ Sesión Activa Detectada',
          message: error.data?.message || 'Ya existe una sesión activa registrada en otro equipo. ¿Deseas desconectar la otra sesión e ingresar en este dispositivo?',
          cancel: {
            label: 'Cancelar',
            color: 'grey-8',
            flat: true
          },
          ok: {
            label: 'Desconectar otra sesión e Ingresar',
            color: 'primary',
            unelevated: true
          },
          persistent: true
        }).onOk(async () => {
          await performLogin(true)
        })
      } else {
        notify.error(error.data?.message || 'Error al iniciar sesión')
      }
    } finally {
      loading.value = false
    }
  }

  async function submit() {
    await performLogin(false)
  }

  return {
    cedula,
    password,
    showPassword,
    loading,
    submit
  }
}
