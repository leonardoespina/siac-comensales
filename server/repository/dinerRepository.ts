/**
 * REPOSITORIO: Comensales y Peticiones (Diners)
 * 
 * REGLAS DE ARQUITECTURA:
 * - ÚNICO lugar autorizado para importar y usar Prisma.
 * - Cero reglas de negocio. Solo operaciones CRUD (Select, Insert, Update, Delete).
 * - No conoce de eventos ni de peticiones HTTP.
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

// --- COMENSALES (DINERS) ---

export async function getDinersBySubdependency(subdependencyId: number, squadId?: number) {
  return prisma.diner.findMany({
    where: { 
      subdependencyId,
      ...(squadId && { squadId }),
      active: true 
    },
    include: {
      squad: true,
      position: true,
      diningRoom: true,
      biometricRecord: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinersByDependency(dependencyId: number) {
  return prisma.diner.findMany({
    where: { 
      subdependency: {
        dependencyId: dependencyId
      },
      active: true 
    },
    include: {
      squad: true,
      subdependency: true,
      position: true,
      diningRoom: true,
      biometricRecord: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinerByCedula(cedula: string) {
  // Normalizar: extraer solo los números
  const numericCedula = cedula.replace(/\D/g, '')

  return prisma.diner.findFirst({
    where: {
      OR: [
        { cedula: cedula },
        { cedula: numericCedula },
        { cedula: `V-${numericCedula}` },
        { cedula: `E-${numericCedula}` },
        { cedula: `V${numericCedula}` },
        { cedula: `E${numericCedula}` }
      ]
    },
    include: {
      squad: true,
      position: true,
      diningRoom: true,
      biometricRecord: true
    }
  })
}

export async function createDiner(data: { cedula: string, name: string, rationType: string, squadId: number, subdependencyId: number, positionId?: number, diningRoomId?: number }) {
  return prisma.diner.create({
    data,
    include: {
      position: true,
      squad: true,
      diningRoom: true
    }
  })
}

export async function updateDiner(id: number, data: { cedula?: string, name?: string, rationType?: string, squadId?: number, subdependencyId?: number, positionId?: number, diningRoomId?: number }) {
  return prisma.diner.update({
    where: { id },
    data,
    include: {
      position: true,
      squad: true,
      diningRoom: true
    }
  })
}

export async function deleteDiner(id: number) {
  // Soft-Delete para no corromper el historial de solicitudes
  return prisma.diner.update({
    where: { id },
    data: { active: false }
  })
}

export async function saveBiometricRecord(dinerId: number, templates: string[]) {
  return prisma.biometricRecord.upsert({
    where: { dinerId },
    update: { templates },
    create: { dinerId, templates }
  })
}

export async function clearBiometricRecord(dinerId: number) {
  return prisma.biometricRecord.delete({
    where: { dinerId }
  })
}

export async function getBiometricRecord(dinerId: number) {
  return prisma.biometricRecord.findUnique({
    where: { dinerId }
  })
}

export async function getAllBiometricRecords() {
  // Retornamos todos los registros activos junto con la info mínima del comensal
  return prisma.biometricRecord.findMany({
    where: { active: true },
    include: {
      diner: {
        select: {
          id: true,
          cedula: true,
          name: true,
          active: true
        }
      }
    }
  })
}

// --- PETICIONES (DINER REQUESTS) ---

export async function getRequestsBySubdependency(subdependencyId: number) {
  // Obtenemos todas las peticiones creadas por usuarios que pertenecen a esa subdependencia
  return prisma.dinerRequest.findMany({
    where: {
      createdBy: {
        subdependencyId: subdependencyId
      }
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      _count: {
        select: { details: true }
      }
    },
    orderBy: { date: 'desc' }
  })
}

export async function getRequestById(id: number) {
  return prisma.dinerRequest.findUnique({
    where: { id },
    include: {
      details: {
        include: {
          diner: {
            include: { squad: true }
          }
        }
      }
    }
  })
}

/**
 * Crea una petición de comida junto con todos sus detalles (comensales asociados)
 * de forma atómica usando Prisma Transactions implícitas.
 */
export async function createDinerRequest(data: {
  date: Date,
  shiftType: string,
  createdById: number,
  diners: Array<{ dinerId: number, rationType: string }>,
  isExtraordinary?: boolean
}) {
  return prisma.dinerRequest.create({
    data: {
      date: data.date,
      shiftType: data.shiftType,
      createdById: data.createdById,
      isExtraordinary: data.isExtraordinary || false,
      status: 'PENDING',
      details: {
        create: data.diners.map(d => ({
          dinerId: d.dinerId,
          rationType: d.rationType
        }))
      }
    },
    include: {
      details: true
    }
  })
}

export async function updateRequestStatus(id: number, status: string, approvedById?: number) {
  return prisma.dinerRequest.update({
    where: { id },
    data: {
      status,
      approvedById
    }
  })
}

// --- MIGRACIÓN MASIVA (BULK ACTIONS) ---

export async function updateDiningRoomBulk(dinerIds: number[], targetDiningRoomId: number, tx?: any) {
  const db = tx || prisma
  return db.diner.updateMany({
    where: {
      id: { in: dinerIds }
    },
    data: {
      diningRoomId: targetDiningRoomId
    }
  })
}
