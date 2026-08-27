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

export async function getDinersBySubdependency(subdependencyId: number, squadId?: number, includeInactive: boolean = false, allowedSiteIds?: number[]) {
  return prisma.diner.findMany({
    where: { 
      subdependencyId,
      ...(squadId && { squadId }),
      ...(includeInactive ? {} : { active: true }),
      ...(allowedSiteIds && allowedSiteIds.length > 0 ? { siteId: { in: allowedSiteIds } } : {})
    },
    include: {
      squad: true,
      position: true,
      site: true,
      biometricRecord: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinersBySubdependencies(subdependencyIds: number[], includeInactive: boolean = false, allowedSiteIds?: number[]) {
  return prisma.diner.findMany({
    where: { 
      subdependencyId: { in: subdependencyIds },
      ...(includeInactive ? {} : { active: true }),
      ...(allowedSiteIds && allowedSiteIds.length > 0 ? { siteId: { in: allowedSiteIds } } : {})
    },
    include: {
      squad: true,
      subdependency: true,
      position: true,
      site: true,
      biometricRecord: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinersByDependency(dependencyId: number, includeInactive: boolean = false, allowedSiteIds?: number[]) {
  return prisma.diner.findMany({
    where: { 
      subdependency: {
        dependencyId: dependencyId
      },
      ...(includeInactive ? {} : { active: true }),
      ...(allowedSiteIds && allowedSiteIds.length > 0 ? { siteId: { in: allowedSiteIds } } : {})
    },
    include: {
      squad: true,
      subdependency: true,
      position: true,
      site: true,
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
      site: true,
      biometricRecord: true
    }
  })
}

export async function createDiner(data: { cedula: string, name: string, rationType: string, squadId: number, subdependencyId: number, positionId?: number, siteId?: number }) {
  return prisma.diner.create({
    data,
    include: {
      position: true,
      squad: true,
      site: true
    }
  })
}

export async function updateDiner(id: number, data: { cedula?: string, name?: string, rationType?: string, squadId?: number, subdependencyId?: number, positionId?: number, siteId?: number }) {
  return prisma.diner.update({
    where: { id },
    data,
    include: {
      position: true,
      squad: true,
      site: true
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
    update: { templates, active: true },
    create: { dinerId, templates, active: true }
  })
}

export async function clearBiometricRecord(dinerId: number) {
  return prisma.biometricRecord.update({
    where: { dinerId },
    data: { active: false }
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
  approvedById?: number,
  status?: string,
  diners: Array<{ dinerId: number, rationType: string }>
}) {
  return prisma.dinerRequest.create({
    data: {
      date: data.date,
      shiftType: data.shiftType,
      createdById: data.createdById,
      approvedById: data.approvedById || data.createdById, // Auto-Aprobado por el mismo creador
      status: data.status || 'APPROVED', // Nacen aprobadas por defecto
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

export async function updateSiteBulk(dinerIds: number[], targetSiteId: number, tx?: any) {
  const db = tx || prisma
  return db.diner.updateMany({
    where: {
      id: { in: dinerIds }
    },
    data: {
      siteId: targetSiteId
    }
  })
}
