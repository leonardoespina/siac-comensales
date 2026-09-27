/**
 * DOMINIO: Biometría Facial y Control de Acceso Hikvision (ISAPI)
 * 
 * REGLAS DE ARQUITECTURA:
 * - CERO dependencias externas (prohibido Prisma, Nuxt, H3, librerías HTTP).
 * - Solo interfaces, tipos y funciones puras (input -> output).
 * - Clases de error heredadas de DomainError.
 */

import { DomainError } from './errors'

// ── TIPOS E INTERFACES ────────────────────────────────────────────────────────

export type BiometricVerifyMode = 'face' | 'fingerprint' | 'card' | 'password' | 'unknown'

export interface HikvisionDeviceConfig {
  diningRoomId: number
  diningRoomName: string
  ip: string
  port: number
  user: string
  password: string
  enabled: boolean
}

export interface HikvisionDigestChallenge {
  realm: string
  nonce: string
  qop?: string
  opaque?: string
  algorithm?: string
}

export interface HikvisionUserPayload {
  employeeNo: string
  name: string
  userType?: string
  doorRight?: string
  planTemplateNo?: string
  beginTime?: string
  endTime?: string
}

export interface BiometricDetectionEvent {
  diningRoomId: number
  diningRoomName: string
  cedula: string
  name: string
  verifyMode: BiometricVerifyMode
  detectedAt: Date
  rawDateTime: string
}

export interface HikvisionFingerprintItem {
  cardReaderNo?: number
  fingerPrintID: number
  fingerType?: string
  fingerData: string
}

export interface BiometricSyncTarget {
  diningRoomId: number
  diningRoomName: string
  userSuccess: boolean
  faceSuccess: boolean
  fpSuccess?: boolean
  error?: string
}

export interface BiometricSyncResult {
  dinerId: number
  cedula: string
  name: string
  targets: BiometricSyncTarget[]
  fpSynced?: boolean
  totalSuccess: boolean
}

export interface BiometricDeleteTarget {
  diningRoomId: number
  diningRoomName: string
  success: boolean
  error?: string
}

export interface BiometricDeleteResult {
  dinerId: number
  cedula: string
  targets: BiometricDeleteTarget[]
  diskCleared: boolean
  dbCleared: boolean
  totalSuccess: boolean
}


// ── ERRORES DE DOMINIO BIOMÉTRICO ─────────────────────────────────────────────

export class HikvisionConnectionError extends DomainError {
  constructor(ip: string, details: string) {
    super(`No fue posible conectar con el biométrico en ${ip}: ${details}`, 'HIKVISION_CONNECTION_ERROR', 503)
  }
}

export class HikvisionAuthError extends DomainError {
  constructor(ip: string, details = 'Fallo de autenticación Digest ISAPI') {
    super(`Credenciales o autenticación inválida en el biométrico ${ip}: ${details}`, 'HIKVISION_AUTH_ERROR', 401)
  }
}

export class BiometricSyncError extends DomainError {
  constructor(cedula: string, diningRoomName: string, reason: string) {
    super(`Fallo al sincronizar comensal [${cedula}] en ${diningRoomName}: ${reason}`, 'BIOMETRIC_SYNC_ERROR', 500)
  }
}

// ── FUNCIONES PURAS DE DOMINIO ────────────────────────────────────────────────

/**
 * Normaliza y limpia una cédula para que sea compatible con employeeNoString de Hikvision.
 */
export function sanitizeEmployeeNo(cedula: string): string {
  if (!cedula) return ''
  // Elimina espacios y caracteres no numéricos o prefijos (ej: V-18073921 -> 18073921)
  return cedula.trim().replace(/\D/g, '')
}

/**
 * Valida si una cédula cumple con el formato estándar de identificación numérica.
 */
export function isValidCedula(cedula: string): boolean {
  const sanitized = sanitizeEmployeeNo(cedula)
  return sanitized.length >= 5 && sanitized.length <= 12
}

/**
 * Construye la URL base HTTP/HTTPS para un dispositivo Hikvision.
 */
export function buildDeviceBaseUrl(ip: string, port = 443, isHttps = true): string {
  const protocol = isHttps ? 'https' : 'http'
  const defaultPort = isHttps ? 443 : 80
  const portSuffix = port && port !== defaultPort ? `:${port}` : ''
  return `${protocol}://${ip}${portSuffix}`
}

/**
 * Determina el modo de verificación a partir del string retornado por el ISAPI de Hikvision.
 */
export function mapVerifyMode(rawMode?: string): BiometricVerifyMode {
  if (!rawMode) return 'unknown'
  const lower = rawMode.toLowerCase()
  if (lower.includes('face')) return 'face'
  if (lower.includes('fp') || lower.includes('finger')) return 'fingerprint'
  if (lower.includes('card')) return 'card'
  if (lower.includes('pwd') || lower.includes('password')) return 'password'
  return 'unknown'
}
