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
            minor: 0,
            timeReverseOrder: true
          }
        }),
        'application/json; charset=UTF-8',
        5000
      )

      if (isClosed) return
      const initData = JSON.parse(initRes.data)
      const topEv = initData.AcsEvent?.InfoList?.[0]
      lastSeenSerial = topEv?.serialNo || initData.AcsEvent?.totalMatches || 0
      console.log(`⚡ [AcsPolling] Modo MinMoe activado para ${device.diningRoomName}. Serial base: #${lastSeenSerial}`)

      // Notificar al menos un tick inicial para que el supervisor marque estado CONNECTED
      callbacks.onData([])
    } catch (err: any) {
      console.warn(`⚠️ [AcsPolling] Error inicializando AcsEvent en ${device.diningRoomName}: ${err.message}`)
      safeClose(`Fallo de inicialización AcsEvent: ${err.message}`)
      return
    }

    // 2. Loop de lectura secuencial periódica de alta velocidad (Reverse Order + Ventana temporal)
    const pad = (n: number) => String(n).padStart(2, '0')
    const pollLoop = async () => {
      if (isClosed) return

      try {
        const now = new Date(Date.now() - 60000)
        const startTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}-04:00`

        const res = await executeIsapiRequest(
          device,
          '/ISAPI/AccessControl/AcsEvent?format=json',
          'POST',
          JSON.stringify({
            AcsEventCond: {
              searchID: `poll_${Date.now()}`,
              searchResultPosition: 0,
              maxResults: 5,
              major: 0,
              minor: 0,
              startTime,
              timeReverseOrder: true
            }
          }),
          'application/json; charset=UTF-8',
          4000
        )

        if (isClosed) return

        if (res.statusCode === 200 && res.data.trim().startsWith('{')) {
          const parsed = JSON.parse(res.data)
          // Orden cronológico (antiguo a nuevo) para procesar ordenadamente
          const infoList: any[] = (parsed?.AcsEvent?.InfoList || []).slice().reverse()
          const adaptedObjects: any[] = []

          for (const item of infoList) {
            const serial = item.serialNo || 0
            if (serial > lastSeenSerial) {
              lastSeenSerial = Math.max(lastSeenSerial, serial)

              // Anti-ráfaga: si el evento ocurrió hace más de 25 segundos, es histórico (no "escupir" a pantalla)
              const eventTime = item.time ? new Date(item.time).getTime() : Date.now()
              if (Date.now() - eventTime > 25000) {
                continue
              }

              const rawId = item.employeeNoString || (item.employeeNo ? String(item.employeeNo) : '') || item.cardNo || ''
              if (rawId && (item.minor === 75 || item.minor === 38 || item.minor === 1 || item.name)) {
                adaptedObjects.push({
                  dateTime: item.time,
                  AccessControllerEvent: {
                    employeeNoString: rawId,
                    name: item.name,
                    currentVerifyMode: item.currentVerifyMode || 'face',
                    verifyMode: item.currentVerifyMode || 'face',
                    serialNo: item.serialNo,
                    time: item.time
                  }
                })
              }
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
