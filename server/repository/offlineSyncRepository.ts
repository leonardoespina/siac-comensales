/**
 * REPOSITORIO: Acceso a Base de Datos para Reconciliación Offline de Comensales
 * 
 * REGLAS DE ARQUITECTURA:
 * - Es el único lugar donde se usa prisma para este flujo.
 * - Solo queries (SELECT, UPDATE). CERO lógica de decisión de negocio.
 * - Soporta $transaction opcional.
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

export async function findDinerForOfflineSync(cedula: string, tx?: Prisma.TransactionClient) {
  const db = tx || prisma
  return await db.diner.findUnique({
    where: { cedula }
  })
}

export async function listActiveMealSchedulesForSync(tx?: Prisma.TransactionClient) {
  const db = tx || prisma
  return await db.mealSchedule.findMany({
    where: { active: true },
    select: {
      id: true,
      shiftType: true,
      startTime: true,
      endTime: true,
      active: true
    }
  })
}

export async function findApprovedRequestsForDinerDate(
  dinerId: number,
  startDate: Date,
  endDate: Date,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma
  return await db.dinerRequestDetail.findMany({
    where: {
      dinerId,
      request: {
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'APPROVED',
        deletedAt: null
      }
    },
    include: {
      request: {
        include: {
          diningRoom: true
        }
      }
    }
  })
}

export async function markRequestDetailDispatched(
  detailId: number,
  dispatchedAt: Date,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma
  return await db.dinerRequestDetail.update({
    where: { id: detailId },
    data: { dispatchedAt }
  })
}
