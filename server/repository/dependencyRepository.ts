/**
 * REPOSITORIO: Estructura Organizacional (Dependencias)
 * 
 * REGLAS DE ARQUITECTURA:
 * - ÚNICO lugar autorizado para importar y usar Prisma.
 * - Cero reglas de negocio. Solo operaciones CRUD (Select, Insert, Update, Delete).
 * - No conoce de eventos ni de peticiones HTTP.
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

// --- DEPENDENCIAS ---

export async function getAllDependencies(includeInactive: boolean = false, filterByDependencyId?: number | null) {
  return prisma.dependency.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(filterByDependencyId ? { id: filterByDependencyId } : {})
    },
    include: {
      subdependencies: {
        where: {
          ...(includeInactive ? {} : { active: true })
        },
        include: {
          diners: {
            select: {
              squadId: true
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function createDependency(name: string) {
  return prisma.dependency.create({
    data: { name }
  })
}

export async function updateDependency(id: number, name: string) {
  return prisma.dependency.update({
    where: { id },
    data: { name }
  })
}

export async function deleteDependency(id: number) {
  return prisma.dependency.update({
    where: { id },
    data: { active: false }
  })
}

export async function restoreDependency(id: number) {
  return prisma.dependency.update({
    where: { id },
    data: { active: true }
  })
}

export async function countActiveSubdependencies(dependencyId: number) {
  return prisma.subdependency.count({
    where: { dependencyId, active: true }
  })
}

// --- SUBDEPENDENCIAS ---

export async function getSubdependenciesByDependency(dependencyId: number, includeInactive: boolean = false) {
  return prisma.subdependency.findMany({
    where: { 
      dependencyId,
      ...(includeInactive ? {} : { active: true })
    },
    orderBy: { name: 'asc' }
  })
}

export async function getSubdependencyById(id: number) {
  return prisma.subdependency.findUnique({
    where: { id }
  })
}

export async function createSubdependency(dependencyId: number, name: string, allowsBulkRequests?: boolean) {
  return prisma.subdependency.create({
    data: {
      dependencyId,
      name,
      allowsBulkRequests: allowsBulkRequests || false
    }
  })
}

export async function updateSubdependency(id: number, name: string, dependencyId?: number, allowsBulkRequests?: boolean) {
  return prisma.subdependency.update({
    where: { id },
    data: {
      name,
      ...(dependencyId && { dependencyId }),
      ...(allowsBulkRequests !== undefined && { allowsBulkRequests })
    }
  })
}

export async function deleteSubdependency(id: number) {
  return prisma.subdependency.update({
    where: { id },
    data: { active: false }
  })
}

export async function restoreSubdependency(id: number) {
  return prisma.subdependency.update({
    where: { id },
    data: { active: true }
  })
}

export async function countActiveDinersBySubdependency(subdependencyId: number) {
  return prisma.diner.count({
    where: { subdependencyId, active: true }
  })
}

// --- CUADRILLAS (SQUADS) ---

export async function getAllSquads(includeInactive: boolean = false) {
  return prisma.squad.findMany({
    where: {
      ...(includeInactive ? {} : { active: true })
    },
    orderBy: { name: 'asc' }
  })
}

export async function createSquad(name: string) {
  return prisma.squad.create({
    data: { name }
  })
}

export async function updateSquad(id: number, name: string) {
  return prisma.squad.update({
    where: { id },
    data: { name }
  })
}

export async function deleteSquad(id: number) {
  return prisma.squad.update({
    where: { id },
    data: { active: false }
  })
}

export async function countActiveDinersBySquad(squadId: number) {
  return prisma.diner.count({
    where: { squadId, active: true }
  })
}
