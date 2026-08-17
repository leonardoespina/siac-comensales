import { eventBus } from '../utils/eventBus'
import { prisma } from '../utils/prisma'
import { io } from './socket'

export default defineNitroPlugin((nitroApp) => {
  console.log('🎧 Inicializando Event Listeners de Comensales...')

  // 1. Sincronización en tiempo real de Comensales
  eventBus.on('diner:created', (payload) => {
    if (io) io.emit('diner:sync', { action: 'create', diner: payload.diner })
  })
  
  eventBus.on('diner:updated', (payload) => {
    if (io) io.emit('diner:sync', { action: 'update', diner: payload.diner })
  })

  eventBus.on('diner:deleted', (payload) => {
    if (io) io.emit('diner:sync', { action: 'delete', diner: { id: payload.id } })
  })

  // 2. Solicitudes de Comida - Creadas
  // NOTA: Como la empresa decidió que NO habrá flujo de aprobación, las solicitudes
  // nacen APROBADAS. Ya no es necesario notificar a nadie para que apruebe.
  eventBus.on('dinerRequest:created', async (payload) => {
    try {
      console.log(`Solicitud ${payload.requestId} auto-aprobada registrada con éxito.`)
    } catch (e) {
      console.error('Error procesando evento dinerRequest:created', e)
    }
  })

  // 3. Solicitudes de Comida - Aprobadas (Notificar a Cocina/Comedor)
  eventBus.on('dinerRequest:approved', async (payload) => {
    try {
      // Notificar a los usuarios de los comedores que preparen la comida.
      // Se podría afinar buscando solo a los del comedor destino, pero por ahora a todos los administradores de cocina.
      const kitchenStaff = await prisma.user.findMany({
        where: {
          active: true,
          role: {
            permissions: {
              some: {
                OR: [
                  { module: { code: 'KITCHEN' }, canRead: true },
                  { module: { code: 'OPERATIONS' }, canRead: true }
                ]
              }
            }
          }
        }
      })

      for (const staff of kitchenStaff) {
        const notif = await prisma.notification.create({
          data: {
            userId: staff.id,
            title: 'Solicitud de Comida Aprobada',
            message: `La solicitud #${payload.requestId} para el turno de ${payload.shiftType} ha sido aprobada.`,
            link: '/kitchen/operation'
          }
        })
        if (io) {
          io.to(`user_${staff.id}`).emit('notification', notif)
        }
      }
    } catch (e) {
      console.error('Error procesando evento dinerRequest:approved', e)
    }
  })
})
