import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { findUserWithAuth, updateUserSession } from '../repository/userRepository'
import { signToken } from '../utils/jwt'
import { emitEvent } from '../utils/eventBus'
import { 
  UnauthorizedError, 
  NotFoundError, 
  ActiveSessionExistsError 
} from '../domain/errors'
import { 
  isDispatchExclusiveRole, 
  isSessionActive, 
  SESSION_INACTIVITY_TIMEOUT_MINUTES 
} from '../domain/auth'

export class AuthService {
  /**
   * Inicia sesión verificando credenciales y gestionando la política de sesión única.
   */
  static async login(cedula: string, password: string, force = false) {
    const user = await findUserWithAuth(cedula)

    if (!user || !user.active) {
      throw new NotFoundError('Usuario', cedula)
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedError('Cédula o contraseña incorrecta')
    }

    // Verificar si el rol tiene permiso exclusivo de Despacho / Kiosco (Exención de Concurrencia)
    const isDispatchRole = isDispatchExclusiveRole(user.role?.permissions as any)

    // Si NO es un rol puramente de despacho, aplicamos la regla de sesión única
    if (!isDispatchRole && user.activeSessionId && !force) {
      if (isSessionActive(user.lastActiveAt)) {
        throw new ActiveSessionExistsError(
          'Ya existe una sesión activa registrada en otro equipo. ¿Deseas desconectar la otra sesión e ingresar aquí?'
        )
      }
    }

    // Generar nuevo identificador único de sesión (UUID)
    const newSessionId = crypto.randomUUID()

    // Actualizar en base de datos
    await updateUserSession(user.id, newSessionId, new Date())

    // Emitir evento para notificar al bus y desconectar dispositivos previos
    emitEvent('session:revoked', { userId: user.id, newSessionId })

    // Generar Token JWT con el sessionId firmado
    const token = signToken({ userId: user.id, sessionId: newSessionId }, '24h')

    const { passwordHash, ...safeUser } = user

    return {
      user: safeUser,
      token,
      sessionId: newSessionId
    }
  }

  /**
   * Cierra formalmente la sesión liberando el activeSessionId.
   */
  static async logout(userId?: number) {
    if (userId) {
      await updateUserSession(userId, null, null)
      emitEvent('session:closed', { userId })
    }
  }
}
