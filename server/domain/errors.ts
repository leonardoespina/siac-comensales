// ── ERRORES DE DOMINIO ──────────────────────────────────────────────────────
// Cumple con la regla de la Arquitectura Híbrida:
// La capa Domain define los tipos de errores permitidos en el sistema.
// Ningún servicio lanza errores genéricos de JS (throw new Error), sino que
// usa estas clases tipadas.

/**
 * Clase base para todos los errores de la aplicación.
 * Permite identificar si un error fue lanzado intencionalmente por nuestra lógica.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

/**
 * Usado cuando se busca un registro por ID y no existe en la BD.
 * Genera un HTTP 404.
 */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string | number) {
    super(`${entity} con id ${id} no encontrado`, 'NOT_FOUND', 404)
  }
}

/**
 * Usado cuando los datos de entrada no cumplen las reglas de validación.
 * Genera un HTTP 422.
 */
export class ValidationError extends DomainError {
  constructor(public readonly errors: string | string[]) {
    super(Array.isArray(errors) ? errors.join(', ') : errors, 'VALIDATION_ERROR', 422)
  }
}

/**
 * Usado cuando un usuario intenta hacer algo sin haber iniciado sesión.
 * Genera un HTTP 401.
 */
export class UnauthorizedError extends DomainError {
  constructor(message = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

/**
 * Usado cuando un usuario inició sesión, pero su rol no le permite esta acción.
 * Genera un HTTP 403.
 */
export class ForbiddenError extends DomainError {
  constructor(message = 'Acceso denegado. No tiene los permisos necesarios.') {
    super(message, 'FORBIDDEN', 403)
  }
}

/**
 * Usado cuando hay un conflicto de estado (ej: registro duplicado o intentar borrar algo en uso).
 * Genera un HTTP 409.
 */
export class ConflictError extends DomainError {
  constructor(entity: string, message: string) {
    super(`${entity}: ${message}`, 'CONFLICT', 409)
  }
}
