/**
 * SUB-SERVICIO: Caso de Uso — Reconexión Manual de Stream Biométrico
 * 
 * RESPONSABILIDAD:
 * - Valida la existencia y estado activo del biométrico en el comedor.
 * - Aplica la regla de cooldown de 30 segundos anti-spam (429 Too Many Requests).
 * - Ejecuta la reinicialización del stream y registra el evento en la tabla de auditoría.
 */

import { DomainError, NotFoundError } from '../../domain/errors'
import { evaluateManualRestart, StreamSnapshot } from '../../domain/biometricStream'
import { getDiningRoomDeviceById } from '../../repository/biometricRepository'
import { startStream, getStreamSnapshot } from './streamSupervisor'
import { logAudit } from '../../utils/audit'

const manualRestartTimestamps = new Map<number, Date>()

export async function requestManualStreamRestart(
  diningRoomId: number,
  userId: number | null
): Promise<StreamSnapshot> {
  const room = await getDiningRoomDeviceById(diningRoomId)
  if (!room || !room.deviceIp || !room.deviceEnabled) {
    throw new NotFoundError('El comedor no posee un terminal biométrico activo configurado.')
  }

  const now = new Date()
  const lastManualAt = manualRestartTimestamps.get(diningRoomId) || null
  const evalResult = evaluateManualRestart(lastManualAt, now)

  if (!evalResult.allowed) {
    throw new DomainError(
      `Reconexión manual en enfriamiento. Espere ${evalResult.retryAfterSec} segundos antes de reintentar.`,
      'RATE_LIMITED',
      429
    )
  }

  manualRestartTimestamps.set(diningRoomId, now)

  const deviceConfig = {
    diningRoomId: room.id,
    diningRoomName: room.name,
    ip: room.deviceIp,
    port: room.devicePort || 443,
    user: room.deviceUser || 'admin',
    password: room.devicePassword || '',
    enabled: room.deviceEnabled
  }

  startStream(deviceConfig)

  await logAudit(
    userId,
    'RECONECTAR',
    'BIOMETRICO_STREAM',
    diningRoomId,
    `Reconexión manual solicitada para biométrico de ${room.name} (IP: ${room.deviceIp})`
  )

  const snapshot = getStreamSnapshot(diningRoomId)
  if (!snapshot) {
    throw new DomainError('Error al obtener el estado del stream tras reiniciar', 'STREAM_ERROR', 500)
  }

  snapshot.canManualRestart = false
  snapshot.cooldownRemainingSec = 30
  return snapshot
}
