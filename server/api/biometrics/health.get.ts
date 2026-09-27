/**
 * HANDLER: Healthcheck de Terminales Biométricos
 *
 * Ruta: GET /api/biometrics/health
 * Consulta el estado de conectividad en tiempo real de todos los terminales
 * Hikvision activos registrados en la base de datos.
 *
 * CAPA 4 — Adaptador HTTP. Sin lógica de negocio.
 */

import { defineApiHandler } from '../../utils/handler'
import { checkTerminalHealth, HikvisionDeviceConfig } from '../../services/hikvisionService'
import { listActiveBiometricDiningRooms } from '../../repository/biometricRepository'

export default defineApiHandler(async (_event) => {
  const activeRooms = await listActiveBiometricDiningRooms()

  if (activeRooms.length === 0) {
    return []
  }

  const healthChecks = await Promise.all(
    activeRooms.map((room) => {
      const config: HikvisionDeviceConfig = {
        diningRoomId: room.id,
        diningRoomName: room.name,
        ip: room.deviceIp!,
        port: room.devicePort || 443,
        user: room.deviceUser || 'admin',
        password: room.devicePassword || '',
        enabled: room.deviceEnabled
      }
      return checkTerminalHealth(config)
    })
  )

  return healthChecks
})
