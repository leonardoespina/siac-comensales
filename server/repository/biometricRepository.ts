/**
 * REPOSITORIO: Biometría y Control de Dispositivos (Biometrics)
 * 
 * REGLAS DE ARQUITECTURA:
 * - ÚNICO lugar autorizado para interactuar con Prisma para datos biométricos.
 * - Cero lógica de negocio, cero HTTP, cero emisión de eventos.
 * - Soporte opcional para transacciones ($transaction).
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

type DbClient = Prisma.TransactionClient | typeof prisma

/**
 * Obtiene todos los comedores activos que tienen terminal biométrico configurado y habilitado.
 */
export async function listActiveBiometricDiningRooms(db: DbClient = prisma) {
  return db.diningRoom.findMany({
    where: {
      active: true,
      deviceEnabled: true,
      deviceIp: { not: null }
    },
    include: {
      site: true
    },
    orderBy: { id: 'asc' }
  })
}

/**
 * Obtiene un comedor específico con sus parámetros de conexión de dispositivo.
 */
export async function getDiningRoomDeviceById(id: number, db: DbClient = prisma) {
  return db.diningRoom.findUnique({
    where: { id },
    include: {
      site: true
    }
  })
}

/**
 * Busca un comensal por su cédula incluyendo sus registros biométricos y dependencias.
 */
export async function getDinerWithBiometricsByCedula(cedula: string, db: DbClient = prisma) {
  return db.diner.findUnique({
    where: { cedula },
    include: {
      biometricRecord: true,
      squad: true,
      subdependency: {
        include: {
          dependency: true
        }
      },
      site: true,
      position: true
    }
  })
}

/**
 * Busca un comensal por su ID numérico incluyendo sus registros biométricos.
 */
export async function getDinerWithBiometricsById(id: number, db: DbClient = prisma) {
  return db.diner.findUnique({
    where: { id },
    include: {
      biometricRecord: true,
      squad: true,
      subdependency: true,
      site: true
    }
  })
}

/**
 * Crea o actualiza el registro biométrico de un comensal.
 */
export async function upsertBiometricRecord(
  dinerId: number,
  templates: string[] = [],
  active: boolean = true,
  db: DbClient = prisma
) {
  return db.biometricRecord.upsert({
    where: { dinerId },
    update: {
      templates,
      active
    },
    create: {
      dinerId,
      templates,
      active
    }
  })
}

/**
 * Obtiene todos los comensales activos con sus registros biométricos para sincronización masiva inicial.
 */
export async function listActiveDinersForSync(db: DbClient = prisma) {
  return db.diner.findMany({
    where: {
      active: true
    },
    include: {
      biometricRecord: true
    },
    orderBy: { id: 'asc' }
  })
}

/**
 * Limpia los registros biométricos de un comensal (resetea templates y desactiva el registro).
 */
export async function clearBiometricRecord(dinerId: number, db: DbClient = prisma) {
  return db.biometricRecord.upsert({
    where: { dinerId },
    update: {
      templates: [],
      active: false
    },
    create: {
      dinerId,
      templates: [],
      active: false
    }
  })
}

/**
 * Limpia la huella dactilar heredada en la tabla Diner.
 */
export async function clearDinerFingerprint(dinerId: number, db: DbClient = prisma) {
  return db.diner.update({
    where: { id: dinerId },
    data: { fingerprint: null }
  })
}

