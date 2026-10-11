/**
 * SUB-SERVICIO: Sondeo AcsEvent (Fallback para Terminales MinMoe V4.38+)
 * 
 * RESPONSABILIDAD:
 * - Lectura periódica de eventos de acceso mediante /ISAPI/AccessControl/AcsEvent.
 * - Mantiene el cursor incremental de serialNo para cero pérdida de marcajes.
 * - Adapta las detecciones al formato AccessControllerEvent esperado por el supervisor.
 */

import { HikvisionDeviceConfig } from '../../domain/biometrics'
import { executeIsapiRequest } from './client'
import type { StreamConnectionCallbacks } from './streamConnection'

export function openAcsPollingConnection(
  device: HikvisionDeviceConfig,
  callbacks: StreamConnectionCallbacks,
  pollIntervalMs = 200
): { close: () => void } {
  let isClosed = false
  let pollTimer: NodeJS.Timeout | null = null
  let lastSeenSerial = 0

  const safeClose = (reason: string) => {
    if (isClosed) return
    isClosed = true
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    callbacks.onClose(reason)
  }

  const startPolling = async () => {
    if (isClosed) return

    try {
      // 1. Obtener el serial inicial más alto registrado en la terminal
      const initRes = await executeIsapiRequest(
        device,
        '/ISAPI/AccessControl/AcsEvent?format=json',
        'POST',
        JSON.stringify({
          AcsEventCond: {
            searchID: `siac_init_${Date.now()}`,
            searchResultPosition: 0,
            maxResults: 1,
            major: 0,
            minor: 0
          }
        }),
        'application/json; charset=UTF-8',
        5000
      )

      if (isClosed) return
      const initData = JSON.parse(initRes.data)
      lastSeenSerial = initData.AcsEvent?.totalMatches || 0
      console.log(`⚡ [AcsPolling] Modo MinMoe activado para ${device.diningRoomName}. Serial base: #${lastSeenSerial}`)

      // Notificar al menos un tick inicial para que el supervisor marque estado CONNECTED
      callbacks.onData([])
    } catch (err: any) {
      console.warn(`⚠️ [AcsPolling] Error inicializando AcsEvent en ${device.diningRoomName}: ${err.message}`)
      safeClose(`Fallo de inicialización AcsEvent: ${err.message}`)
      return
    }

    // 2. Loop de lectura secuencial periódica
    const pollLoop = async () => {
      if (isClosed) return

      try {
        const queryOffset = Math.max(0, lastSeenSerial - 2)
        const res = await executeIsapiRequest(
          device,
          '/ISAPI/AccessControl/AcsEvent?format=json',
          'POST',
          JSON.stringify({
            AcsEventCond: {
              searchID: `poll_${Date.now()}`,
              searchResultPosition: queryOffset,
              maxResults: 15,
              major: 5,
              minor: 75
            }
          }),
          'application/json; charset=UTF-8',
          4000
        )

        if (isClosed) return

        if (res.statusCode === 200) {
          const parsed = JSON.parse(res.data)
          const infoList: any[] = parsed?.AcsEvent?.InfoList || []
          const adaptedObjects: any[] = []

          for (const item of infoList) {
            const serial = item.serialNo || 0
            if (serial > lastSeenSerial) {
              lastSeenSerial = serial
              adaptedObjects.push({
                dateTime: item.time,
                AccessControllerEvent: {
                  employeeNoString: item.employeeNoString || (item.employeeNo ? String(item.employeeNo) : ''),
                  name: item.name,
                  currentVerifyMode: item.currentVerifyMode || 'face',
                  verifyMode: item.currentVerifyMode || 'face',
                  serialNo: item.serialNo,
                  time: item.time
                }
              })
            }
          }

          if (adaptedObjects.length > 0) {
            callbacks.onData(adaptedObjects)
          }
        }
      } catch (err: any) {
        // En caso de fallo transitorio, registrar advertencia sin colapsar de inmediato
        if (!isClosed) {
          console.warn(`⚠️ [AcsPolling] Reintento de consulta (${device.diningRoomName}): ${err.message}`)
        }
      } finally {
        if (!isClosed) {
          pollTimer = setTimeout(pollLoop, pollIntervalMs)
        }
      }
    }

    pollTimer = setTimeout(pollLoop, pollIntervalMs)
  }

  startPolling()

  return {
    close: () => safeClose('Cierre manual solicitado por el usuario/supervisor')
  }
}
