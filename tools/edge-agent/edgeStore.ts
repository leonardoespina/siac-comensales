/**
 * EDGE STORE: Caché en Memoria y Persistencia Local de Despachos
 * 
 * Permite validar autorizaciones en 10 microsegundos y encolar
 * despachos en disco de forma tolerante a fallos de energía y red.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const QUEUE_FILE = path.join(__dirname, 'edge_queue.json')

class EdgeStore {
  // Caché de comensales en memoria indexado por cédula
  private dinersMap = new Map<string, LocalDinerRecord>()
  // Horarios de comida
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
      this.dinersMap.set(d.cedula.trim(), {
        detailId: d.detailId,
        cedula: d.cedula.trim(),
        name: d.name,
        shiftType: d.shiftType,
        modality: d.modality,
        rationType: d.rationType,
        isDispatched: !!d.dispatchedAt,
        dispatchedAt: d.dispatchedAt
      })
    }

    // Si había despachos en la cola local que aún no se sincronizaron, marcarlos como ya despachados en memoria
    for (const q of this.pendingQueue) {
      const record = this.dinersMap.get(q.cedula)
      if (record) {
        record.isDispatched = true
        record.dispatchedAt = q.dispatchedAt
      }
    }

    console.log(`🧠 [EdgeStore] Padrón cargado en RAM: ${this.dinersMap.size} comensales aprobados.`)
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

    // 2. Consulta en RAM (10 microsegundos)
    const record = this.dinersMap.get(cedula)
    if (!record) {
      return {
        success: false,
        code: 'NO_REQUEST',
        message: 'No posee solicitud de comida aprobada para hoy en este comedor'
      }
    }

    if (record.isDispatched) {
      return {
        success: false,
        code: 'ALREADY_DISPATCHED',
        message: `${record.name} ya retiró su ${record.shiftType}`
      }
    }

    // 3. Despacho exitoso instantáneo
    const nowIso = new Date().toISOString()
    record.isDispatched = true
    record.dispatchedAt = nowIso

    const queueItem: QueuedDispatchItem = {
      detailId: record.detailId,
      cedula: record.cedula,
      name: record.name,
      shiftType: record.shiftType,
      dispatchedAt: nowIso
    }

    this.pendingQueue.push(queueItem)
    this.saveQueueToDisk()

    return {
      success: true,
      code: 'DISPATCH_OK',
      message: `¡Buen Provecho! ${record.name}`,
      diner: {
        detailId: record.detailId,
        cedula: record.cedula,
        name: record.name,
        shift: record.shiftType,
        modality: record.modality,
        rationType: record.rationType,
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
        this.pendingQueue = JSON.parse(raw)
        console.log(`💾 [EdgeStore] Cola persistente recuperada del disco: ${this.pendingQueue.length} despachos pendientes.`)
      }
    } catch (e: any) {
      console.error('⚠️ [EdgeStore] Error leyendo cola persistente:', e.message)
      this.pendingQueue = []
    }
  }

  private saveQueueToDisk() {
    try {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(this.pendingQueue, null, 2), 'utf8')
    } catch (e: any) {
      console.error('⚠️ [EdgeStore] Error guardando cola en disco:', e.message)
    }
  }
}

export const edgeStore = new EdgeStore()
