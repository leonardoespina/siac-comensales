/**
 * PLUGIN NITRO: Inicializador y Listener de Biometría Hikvision Multi-Sede
 * 
 * RESPONSABILIDAD:
 * - Arranca el pool de conexiones en tiempo real (alertStream) con los biométricos de cada comedor.
 * - Conecta los eventos del EventBus con Socket.io para actualizar la pantalla de despacho del operador en vivo.
 */

import { eventBus } from '../utils/eventBus'
import {
  initSupervisorAllStreams,
  syncDinerAcrossAllTerminals,
  startStream,
  stopStream
} from '../services/hikvisionService'
import { getDiningRoomDeviceById } from '../repository/biometricRepository'
import { io } from './socket'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('📡 [Hikvision Plugin] Inicializando módulo biométrico multi-sede con supervisor de streams...')

  // 1. Iniciar el supervisor para todos los comedores con biométrico activo
  try {
    await initSupervisorAllStreams()
  } catch (err: any) {
    console.error('❌ [Hikvision Plugin] Error al inicializar supervisor de streams:', err.message)
  }

  // 2. Transmitir eventos biométricos detectados hacia Socket.io para la UI del operador
  eventBus.on('biometric:identified', (event) => {
    const socketServer = io || (globalThis as any).__sioInstance
    if (socketServer) {
      console.log(`📡 [Hikvision Plugin] Emitiendo detección facial a Socket.io (Comedor ${event.diningRoomId}, Cédula: ${event.cedula})`)
      // Emitir al canal específico del comedor y al canal global
      socketServer.to(`dining_room_${event.diningRoomId}`).emit('biometric:identified', event)
      socketServer.emit('biometric:identified', event)
      socketServer.emit('biometric:scan', event)
    } else {
      console.warn('⚠️ [Hikvision Plugin] Socket.io no disponible para emitir detección biométrica')
    }
  })

  // 3. Transmitir eventos de sincronización multi-sede hacia Socket.io
  eventBus.on('biometric:synced', (syncEvent) => {
    const socketServer = io || (globalThis as any).__sioInstance
    if (socketServer) {
      socketServer.emit('biometric:synced', syncEvent)
    }
  })

  // 5. Transmitir cambios de estado de streams hacia Socket.io (Canal de comedor y global)
  eventBus.on('biometric:stream_status_changed', (statusEvent) => {
    const socketServer = io || (globalThis as any).__sioInstance
    if (socketServer) {
      socketServer.to(`dining_room_${statusEvent.diningRoomId}`).emit('biometric:stream_status_changed', statusEvent)
      socketServer.emit('biometric:stream_status_changed', statusEvent)
    }
  })

  // 6. Recarga en caliente si cambia la configuración de un dispositivo desde Comedores
  eventBus.on('diningRoom:device_updated', async ({ diningRoomId }) => {
    try {
      const room = await getDiningRoomDeviceById(diningRoomId)
      if (!room || !room.deviceIp || !room.deviceEnabled) {
        stopStream(diningRoomId)
      } else {
        startStream({
          diningRoomId: room.id,
          diningRoomName: room.name,
          ip: room.deviceIp,
          port: room.devicePort || 443,
          user: room.deviceUser || 'admin',
          password: room.devicePassword || '',
          enabled: room.deviceEnabled
        })
      }
    } catch (err: any) {
      console.error(`❌ [Hikvision Plugin] Error recargando stream para comedor ${diningRoomId}:`, err?.message || err)
    }
  })
})

