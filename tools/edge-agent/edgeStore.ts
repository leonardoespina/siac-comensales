/**
 * EDGE STORE: Caché en Memoria y Persistencia Local de Despachos
 * 
 * Permite validar autorizaciones en 10 microsegundos y encolar
 * despachos en disco de forma tolerante a fallos de energía y red.
 * Valida dinámicamente horarios activos recibidos de la base de datos (0 hardcodeo).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export interface LocalDinerRecord {
  detailId: number
  cedula: string
  name: string
  shiftType: string
  modality: string
  rationType: string
  isDispatched: boolean
  dispatchedAt?: string
}

export interface QueuedDispatchItem {
  detailId: number
  cedula: string
  name: string
  shiftType: string
  dispatchedAt: string
}

const agentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const QUEUE_FILE = path.join(agentDir, 'edge_queue.json')

class EdgeStore {
  // Caché de comensales en memoria indexado por cédula (soporta múltiples turnos al día)
  private dinersMap = new Map<string, LocalDinerRecord[]>()
  // Horarios de comida dinámicos recibidos de la base de datos central
  private schedules: any[] = []
  // Cola persistente de despachos pendientes de sincronizar con el servidor central
  private pendingQueue: QueuedDispatchItem[] = []
  // Anti-rebote en memoria (4 segundos por cédula)
  private debounceMap = new Map<string, number>()
  private DEBOUNCE_MS = 4000

  constructor() {
    this.loadQueueFromDisk()
  }

  public populateFromDailySheet(diners: any[], schedules: any[]) {
    this.dinersMap.clear()
    this.schedules = schedules || []

    for (const d of diners) {
      const cleanCedula = d.cedula.trim()
      const list = this.dinersMap.get(cleanCedula) || []
      list.push({
        detailId: d.detailId,
        cedula: cleanCedula,
        name: d.name,
        shiftType: d.shiftType,
        modality: d.modality,
        rationType: d.rationType,
        isDispatched: !!d.dispatchedAt,
        dispatchedAt: d.dispatchedAt
      })
      this.dinersMap.set(cleanCedula, list)
    }

    // Si había despachos en la cola local pendientes de sincronizar, marcarlos en memoria
    for (const q of this.pendingQueue) {
      const list = this.dinersMap.get(q.cedula)
      if (list) {
        const target = list.find(item => item.detailId === q.detailId || item.shiftType === q.shiftType)
        if (target) {
          target.isDispatched = true
          target.dispatchedAt = q.dispatchedAt
        }
      }
    }

    let totalRecords = 0
    for (const records of this.dinersMap.values()) totalRecords += records.length
    console.log(`🧠 [EdgeStore] Padrón cargado en RAM: ${this.dinersMap.size} comensales (${totalRecords} raciones autorizadas hoy).`)
    console.log(`⏰ [EdgeStore] Horarios sincronizados: ${this.schedules.map(s => `${s.shiftType} (${s.startTime}-${s.endTime})`).join(', ')}`)
  }

  public getDinerName(cedula: string): string | null {
    const raw = cedula.trim()
    const cleanCedula = raw.replace(/\D/g, '')
    const list = this.dinersMap.get(cleanCedula) || this.dinersMap.get(raw)
    return list?.[0]?.name || null
  }


  /**
   * Evalúa dinámicamente cuál turno está activo en este instante según los horarios de la base de datos
   */
  public getActiveShiftAndUpcoming(): {
    activeShift: string | null
    activeSchedule: any | null
    upcomingMessage: string
  } {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const nowTime = formatter.format(new Date()) // Formato "HH:mm" estricto Venezuela

    let activeShift: string | null = null
    let activeSchedule: any | null = null
    let upcomingMessage = ''

    for (const sched of this.schedules) {
      const start = (sched.startTime || '').trim()
      const end = (sched.endTime || '').trim()
      if (!start || !end) continue

      let isMatching = false
      if (end < start) {
        // Turno que cruza la medianoche (ej: 22:00 a 02:00)
        if (nowTime >= start || nowTime <= end) isMatching = true
      } else {
        if (nowTime >= start && nowTime <= end) isMatching = true
      }

      if (isMatching) {
        activeShift = sched.shiftType
        activeSchedule = sched
        break
      } else {
        if (nowTime < start) {
          upcomingMessage += `[${sched.shiftType}: ${start} - ${end}] `
        }
      }
    }

    return { activeShift, activeSchedule, upcomingMessage }
  }

  public validateAndDispatchInstant(rawCedula: string): {
    success: boolean
    code: string
    message: string
    diner?: any
  } {
    const cedula = rawCedula.replace(/\D/g, '').trim()
    if (!cedula) {
      return { success: false, code: 'INVALID_ID', message: 'Identificación no válida' }
    }

    // 1. Anti-rebote
    const now = Date.now()
    const lastScan = this.debounceMap.get(cedula) || 0
    if (now - lastScan < this.DEBOUNCE_MS) {
      return { success: false, code: 'DEBOUNCE', message: 'Detección duplicada reciente' }
    }
    this.debounceMap.set(cedula, now)

    // 2. Consulta de turno activo dinámico según horarios de la base de datos
    const { activeShift, upcomingMessage } = this.getActiveShiftAndUpcoming()

    if (!activeShift) {
      const msg = upcomingMessage.trim()
        ? `Estás fuera de horario de comida. Próximo turno: ${upcomingMessage}`
        : 'Estás fuera de horario de comida. No hay turnos activos en este momento.'
      return {
        success: false,
        code: 'OUT_OF_SCHEDULE',
        message: msg
      }
    }

    // 3. Consulta en RAM (10 microsegundos)
    const records = this.dinersMap.get(cedula)
    if (!records || records.length === 0) {
      return {
        success: false,
        code: 'NO_REQUEST',
        message: 'No posee solicitud de comida aprobada para hoy en este comedor'
      }
    }

    // 4. Buscar si tiene solicitud aprobada para el turno activo
    const matchingRecord = records.find(r => r.shiftType === activeShift)
    if (!matchingRecord) {
      const otherShifts = records.map(r => r.shiftType).join(', ')
      return {
        success: false,
        code: 'NO_REQUEST_FOR_ACTIVE_SHIFT',
        message: `Su comida no fue solicitada para el turno activo (${activeShift}). Sus turnos hoy: ${otherShifts}`
      }
    }

    // 5. Verificar si ya fue despachado
    if (matchingRecord.isDispatched) {
      return {
        success: false,
        code: 'ALREADY_DISPATCHED',
        message: `${matchingRecord.name} ya retiró su ${activeShift}`
      }
    }

    // 6. Despacho exitoso instantáneo
    const nowIso = new Date().toISOString()
    matchingRecord.isDispatched = true
    matchingRecord.dispatchedAt = nowIso

    const queueItem: QueuedDispatchItem = {
      detailId: matchingRecord.detailId,
      cedula: matchingRecord.cedula,
      name: matchingRecord.name,
      shiftType: matchingRecord.shiftType,
      dispatchedAt: nowIso
    }

    this.pendingQueue.push(queueItem)
    this.saveQueueToDisk()

    return {
      success: true,
      code: 'DISPATCH_OK',
      message: `¡Buen Provecho! ${matchingRecord.name}`,
      diner: {
        detailId: matchingRecord.detailId,
        cedula: matchingRecord.cedula,
        name: matchingRecord.name,
        shift: matchingRecord.shiftType,
        modality: matchingRecord.modality,
        rationType: matchingRecord.rationType,
        dispatchedAt: nowIso
      }
    }
  }

  public getPendingQueue(): QueuedDispatchItem[] {
    return [...this.pendingQueue]
  }

  public confirmSyncedBatch(detailIds: number[]) {
    const idSet = new Set(detailIds)
    this.pendingQueue = this.pendingQueue.filter(item => !idSet.has(item.detailId))
    this.saveQueueToDisk()
  }

  public getStats() {
    return {
      totalApprovedInRam: this.dinersMap.size,
      queuedPendingSync: this.pendingQueue.length
    }
  }

  private loadQueueFromDisk() {
    try {
      if (fs.existsSync(QUEUE_FILE)) {
        const raw = fs.readFileSync(QUEUE_FILE, 'utf8')
        this.pendingQueue = JSON.parse(raw) || []
      }
    } catch {
      this.pendingQueue = []
    }
  }

  private saveQueueToDisk() {
    try {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(this.pendingQueue, null, 2), 'utf8')
    } catch (err: any) {
      console.error('❌ [EdgeStore] Error persistiendo cola en disco:', err.message)
    }
  }
}

export const edgeStore = new EdgeStore()
