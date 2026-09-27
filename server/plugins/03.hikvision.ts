/**
 * PLUGIN NITRO: Inicializador y Listener de Biometría Hikvision Multi-Sede
 * 
 * RESPONSABILIDAD:
 * - Arranca el pool de conexiones en tiempo real (alertStream) con los biométricos de cada comedor.
 * - Conecta los eventos del EventBus con Socket.io para actualizar la pantalla de despacho del operador en vivo.
 */

import { eventBus } from '../utils/eventBus'
import { listActiveBiometricDiningRooms } from '../repository/biometricRepository'
import { startAlertStreamForDiningRoom, syncDinerAcrossAllTerminals } from '../services/hikvisionService'
import { HikvisionDeviceConfig } from '../domain/biometrics'
import { io } from './socket'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('📡 [Hikvision Plugin] Inicializando módulo biométrico multi-sede...')

  // 1. Iniciar escuchas alertStream para todos los comedores con biométrico activo
  try {
    const activeRooms = await listActiveBiometricDiningRooms()
    console.log(`📡 [Hikvision Plugin] Comedores configurados para biometría: ${activeRooms.length}`)

    for (const room of activeRooms) {
      if (!room.deviceIp) continue

      const devConfig: HikvisionDeviceConfig = {
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }

      startAlertStreamForDiningRoom(devConfig)
    }
  } catch (err: any) {
    console.error('❌ [Hikvision Plugin] Error al inicializar pool de terminales:', err.message)
  }

  // 2. Transmitir eventos biométricos detectados hacia Socket.io para la UI del operador
  eventBus.on('biometric:identified', (event) => {
    if (io) {
      // Emitir al canal específico del comedor y al canal global
      io.to(`dining_room_${event.diningRoomId}`).emit('biometric:identified', event)
      io.emit('biometric:scan', event)
    }
  })

  // 3. Transmitir eventos de sincronización multi-sede hacia Socket.io
  eventBus.on('biometric:synced', (syncEvent) => {
    if (io) {
      io.emit('biometric:synced', syncEvent)
    }
  })

  // 4. Auto-replicación multi-sede en segundo plano ante nuevos enrolamientos detectados
  eventBus.on('biometric:enrolled', async (event) => {
    console.log(`🔄 [Hikvision Plugin] Nuevo enrolamiento detectado para cédula ${event.cedula} (ID: ${event.dinerId}). Iniciando auto-replicación multi-sede...`)
    try {
      const result = await syncDinerAcrossAllTerminals(event.dinerId)
      console.log(`✅ [Hikvision Plugin] Auto-replicación completada para cédula ${event.cedula}: ${result.totalSuccess ? 'Éxito en todas las sedes' : 'Parcial/Con advertencias'}`)
    } catch (err: any) {
      console.error(`❌ [Hikvision Plugin] Error en auto-replicación multi-sede para ${event.cedula}:`, err?.message || err)
    }
  })
})
