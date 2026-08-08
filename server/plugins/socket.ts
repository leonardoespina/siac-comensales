import { Server as SocketServer } from 'socket.io'

// Variable global para mantener la instancia y usarla en otros endpoints
export let io: SocketServer

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // Enlazar socket.io al servidor HTTP subyacente de Nuxt solo la primera vez
    const server = (event.node.req.socket as any)?.server
    if (server && !server.__sio) {
      io = new SocketServer(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      })
      server.__sio = io

      console.log('⚡ Socket.io servidor inicializado correctamente.')

      io.on('connection', (socket) => {
        // Cuando un usuario se loguea en el frontend, enviará un evento 'join' con su payload
        socket.on('join', (payload: { userId: number, warehouseId?: number | null }) => {
          socket.join(`user_${payload.userId}`)
          
          if (payload.warehouseId) {
            socket.join(`warehouse_${payload.warehouseId}`)
          } else {
            socket.join(`global_inventory`)
          }
        })
      })
    }
  })
})
