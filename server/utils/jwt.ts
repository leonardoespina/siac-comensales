import jwt, { type SignOptions } from 'jsonwebtoken'
import { UnauthorizedError } from '../domain/errors'

// ── MANEJO DE TOKENS JWT ──────────────────────────────────────────────────
// Este archivo encapsula la librería jsonwebtoken. 
// Generamos tokens al hacer login y los verificamos en cada petición protegida.

export function signToken(payload: object, expiresIn: SignOptions['expiresIn'] = '24h') {
  const config = useRuntimeConfig()
  // Usamos la variable de entorno JWT_SECRET que definiste en tu .env
  return jwt.sign(payload, config.jwtSecret as string, { expiresIn })
}

export function verifyToken(token: string) {
  const config = useRuntimeConfig()
  try {
    return jwt.verify(token, config.jwtSecret as string)
  } catch (error) {
    // Si el token fue manipulado o ya expiró, lanzamos nuestro error genérico
    throw new UnauthorizedError('Token de seguridad inválido o expirado')
  }
}
