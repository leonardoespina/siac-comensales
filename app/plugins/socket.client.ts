import { io } from 'socket.io-client'

export default defineNuxtPlugin(() => {
  // Conectarse al mismo host donde corre Nuxt
  const socket = io()

  socket.on('connect', () => {
    console.log('⚡ Conectado al servidor de WebSockets')
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
