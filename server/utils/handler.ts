import { DomainError } from '../domain/errors'
import type { EventHandler } from 'h3'
import { logger } from './logger'

// ── WRAPPER DE API HANDLERS ─────────────────────────────────────────────────
// Cumple con la regla de la Arquitectura Híbrida:
// Los endpoints en server/api/ NUNCA deben usar bloques try/catch manuales.
// En su lugar, se envuelven con `defineApiHandler`.

export function defineApiHandler(handler: EventHandler): EventHandler {
  return defineEventHandler(async (event) => {
    const start = Date.now()
    const method = event.node.req.method
    const url = event.node.req.url
    const ip = getRequestIP(event) || 'unknown'

    try {
      const response = await handler(event)
      
      // Loguear petición exitosa
      const ms = Date.now() - start
      logger.http(`HTTP ${method} ${url}`, {
        method,
        url,
        statusCode: event.node.res.statusCode || 200,
        responseTimeMs: ms,
        ip
      })
      
      return response
    } catch (error: any) {
      const ms = Date.now() - start
      
      // Si el error viene de nuestras reglas de negocio (ej. NotFoundError)
      if (error instanceof DomainError) {
        logger.warn(`Domain Error: ${error.message}`, {
          method, url, statusCode: error.statusCode, code: error.code, responseTimeMs: ms, ip
        })
        throw createError({
          statusCode: error.statusCode,
          message: error.message,
          data: { code: error.code },
        })
      }
      
      // Si es un error inesperado (BD caída, sintaxis, etc)
      logger.error(`Unhandled Error: ${error.message || 'Unknown'}`, {
        method, url, responseTimeMs: ms, ip,
        stack: error.stack
      })
      
      throw error
    }
  })
}
