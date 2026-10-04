/**
 * FACHADA MODULAR: Servicios Biométricos Hikvision
 * 
 * RESPONSABILIDAD:
 * - Unificar y re-exportar todos los sub-servicios de Hikvision.
 * - Cumple estrictamente con AGENTS.md (servicios < 150 líneas por archivo).
 */

export * from './client'
export * from './user'
export * from './fingerprint'
export * from './face'
export * from './capture'
export * from './health'
export * from './syncHub'
export * from './stream'
