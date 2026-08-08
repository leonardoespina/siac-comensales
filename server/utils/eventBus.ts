import mitt from 'mitt'

/**
 * Catálogo Central de Eventos de Dominio (AppEvents)
 * Aquí se definen todos los eventos que pueden ocurrir en el sistema y el tipo de dato exacto (payload) que envían.
 */
export type AppEvents = {
  // Recepciones
  'reception:created': { id: number, destinationId: number }
  'reception:status_changed': { id: number, status: string, userId: number }
  
  // Transferencias
  'transfer:created': { id: number, sourceId: number, destinationId: number }
  'transfer:status_changed': { id: number, status: string, userId: number }
  
  // Inventario / Alertas
  'stock:below-minimum': { warehouseId: number, productId: number, currentQuantity: number, minimumQuantity: number }
  
  // Comensales (Sincronización en tiempo real)
  'diner:created': { diner: any }
  'diner:updated': { diner: any }
  'diner:deleted': { id: number }
  
  // Peticiones de Comensales
  'dinerRequest:created': { requestId: number, subdependencyId: number }
  'dinerRequest:approved': { requestId: number, shiftType: string, date: Date }
  
  // Inventario general
  'inventory:updated': { warehouseId?: number, productId?: number, quantity?: number }
  
  // Transacciones en tiempo real (Sockets)
  'transaction:sync': { action: 'create' | 'update' | 'delete', transaction: any }
  
  // Turnos en tiempo real (Sockets)
  'shift:sync': { action: 'create' | 'update', shift: any }
}

// Singleton in-memory bus (Resistente a HMR de Nuxt en desarrollo)
const globalObj = globalThis as any
export const eventBus = globalObj.__appEventBus || (globalObj.__appEventBus = mitt<AppEvents>())

/**
 * Función Helper para emitir eventos fuertemente tipados
 */
export function emitEvent<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
  // Emitimos internamente para que los listeners (ej. WebSockets, Logs) reaccionen
  eventBus.emit(event, payload)
  console.log(`[EventBus] Emitted: ${event}`, payload)
}
