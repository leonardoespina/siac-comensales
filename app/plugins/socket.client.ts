import { io } from 'socket.io-client'
import { useAuthStore } from '~/stores/auth'
import { Dialog } from 'quasar'

export default defineNuxtPlugin(() => {
  // Conectarse al mismo host donde corre Nuxt
  const socket = io()

  socket.on('connect', () => {
    console.log('⚡ Conectado al servidor de WebSockets')
    const auth = useAuthStore()
    if (auth.user?.id) {
      socket.emit('join', { userId: auth.user.id, warehouseId: auth.user.warehouseId })
    }
  })

  // Desconexión instantánea cuando otro dispositivo toma el control
  socket.on('session:revoked', (data: { userId: number, newSessionId: string }) => {
    const auth = useAuthStore()
    if (auth.user?.id === data.userId) {
      auth.user = null
      Dialog.create({
        title: '⚠️ Sesión Finalizada',
        message: 'Tu sesión se ha cerrado automáticamente porque se inició sesión en otro dispositivo.',
        ok: {
          label: 'Ir al Login',
          color: 'primary',
          unelevated: true
        },
        persistent: true
      }).onOk(() => {
        navigateTo('/login')
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ Desconectado del servidor de WebSockets')
  })

  return {
    provide: {
      socket
    }
  }
})
