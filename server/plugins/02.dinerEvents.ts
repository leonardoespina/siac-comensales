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

  // 2. Solicitudes de Comida - Creadas (Notificar a Aprobadores)
  eventBus.on('dinerRequest:created', async (payload) => {
    try {
      // payload.subdependencyId en realidad es el createdById en el servicio actualmente.
      // Vamos a obtener al usuario creador para saber su área.
      const creator = await prisma.user.findUnique({
        where: { id: payload.subdependencyId }
      })

      if (!creator) return

      // Buscar a los administradores de la dependencia/subdependencia o administradores globales
      const approvers = await prisma.user.findMany({
        where: {
          active: true,
          OR: [
            // Aprobadores del área específica
            {
              subdependencyId: creator.subdependencyId,
              role: {
                permissions: {
                  some: {
                    module: { code: 'DINERS' }, // o DINERS_APPROVAL si existiera
                    canUpdate: true
                  }
                }
              }
            },
            // Administradores de la dependencia superior
            {
              dependencyId: creator.dependencyId,
              subdependencyId: null, // Gerente principal
              role: {
                permissions: {
                  some: {
                    module: { code: 'DINERS' },
                    canUpdate: true
                  }
                }
              }
            },
            // Administradores Globales
            {
              role: {
                permissions: {
                  some: {
                    module: { code: 'GLOBAL_ACCESS' },
                    canRead: true
                  }
                }
              }
            }
          ]
        }
      })

      for (const approver of approvers) {
        // Evitar auto-notificarse si el creador también es aprobador
        if (approver.id === creator.id && approvers.length > 1) continue

        const notif = await prisma.notification.create({
          data: {
            userId: approver.id,
            title: 'Nueva Solicitud de Comida',
            message: `Se ha registrado una solicitud #${payload.requestId} que requiere aprobación.`,
            link: '/diners/requests' // Ajustar según la ruta real del frontend
          }
        })
        if (io) {
          io.to(`user_${approver.id}`).emit('notification', notif)
        }
      }
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
