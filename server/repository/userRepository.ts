import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

/**
 * REPOSITORIO DE USUARIOS
 * Encapsula todo el acceso a Prisma para el modelo User.
 */

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id }
  })
}

export async function findUserByCedula(cedula: string) {
  return prisma.user.findUnique({
    where: { cedula }
  })
}

export async function findUserWithAuth(cedula: string) {
  return prisma.user.findUnique({
    where: { cedula },
    include: {
      role: {
        include: {
          permissions: {
            include: { module: true }
          }
        }
      },
      subdependency: {
        select: {
          name: true,
          dependencyId: true,
          dependency: { select: { name: true } }
        }
      }
    }
  })
}

export async function updateUserSession(id: number, activeSessionId: string | null, lastActiveAt: Date | null = new Date()) {
  return prisma.user.update({
    where: { id },
    data: {
      activeSessionId,
      lastActiveAt
    }
  })
}

export async function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({
    data,
    include: { 
      role: { select: { id: true, name: true } }, 
      sites: true 
    }
  })
}

export async function updateUser(id: number, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    include: { 
      role: { select: { id: true, name: true } }, 
      sites: true 
    }
  })
}

export async function deactivateUser(id: number) {
  return prisma.user.update({
    where: { id },
    data: { active: false }
  })
}
