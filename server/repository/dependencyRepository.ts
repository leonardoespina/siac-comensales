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

export async function getAllDependencies() {
  return prisma.dependency.findMany({
    where: { active: true },
    include: {
      subdependencies: {
        where: { active: true },
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
  return prisma.dependency.delete({
    where: { id }
  })
}

// --- SUBDEPENDENCIAS ---

export async function getSubdependenciesByDependency(dependencyId: number) {
  return prisma.subdependency.findMany({
    where: { dependencyId },
    orderBy: { name: 'asc' }
  })
}

export async function createSubdependency(dependencyId: number, name: string) {
  return prisma.subdependency.create({
    data: {
      dependencyId,
      name
    }
  })
}

export async function updateSubdependency(id: number, name: string, dependencyId?: number) {
  return prisma.subdependency.update({
    where: { id },
    data: {
      name,
      ...(dependencyId && { dependencyId })
    }
  })
}

export async function deleteSubdependency(id: number) {
  return prisma.subdependency.delete({
    where: { id }
  })
}

// --- CUADRILLAS (SQUADS) ---

export async function getAllSquads() {
  return prisma.squad.findMany({
    where: { active: true },
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
