/**
 * REPOSITORIO: Acceso a Datos para el Módulo Edge Dispatch (Kiosco Local)
 * 
 * REGLAS DE ARQUITECTURA:
 * - Es el único lugar donde se usa prisma para este flujo.
 * - Solo queries (SELECT, UPDATE). CERO decisiones de negocio.
 * - Soporta $transaction opcional para garantizar atomicidad en lotes.
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

export async function getDiningRoomConfigForEdge(diningRoomId: number, tx?: Prisma.TransactionClient) {
  const db = tx || prisma
  return await db.diningRoom.findUnique({
    where: { id: diningRoomId },
    select: {
      id: true,
      name: true,
      deviceIp: true,
      devicePort: true,
      deviceUser: true,
      devicePassword: true,
      deviceEnabled: true
    }
  })
}

export async function getApprovedRequestsForDiningRoomDate(
  diningRoomId: number,
  dayStart: Date,
  dayEnd: Date,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma
  return await db.dinerRequestDetail.findMany({
    where: {
      request: {
        diningRoomId,
        date: { gte: dayStart, lte: dayEnd },
        status: 'APPROVED',
        deletedAt: null
      }
    },
    select: {
      id: true,
      modality: true,
      rationType: true,
      dispatchedAt: true,
      diner: {
        select: {
          id: true,
          cedula: true,
          name: true,
          rationType: true
        }
      },
      request: {
        select: {
          id: true,
          shiftType: true,
          date: true
        }
      }
    }
  })
}

export async function getActiveMealSchedulesForEdge(tx?: Prisma.TransactionClient) {
  const db = tx || prisma
  return await db.mealSchedule.findMany({
    where: { active: true },
    select: {
      id: true,
      shiftType: true,
      startTime: true,
      endTime: true
    }
  })
}

export async function batchUpdateDispatchedDetails(
  items: Array<{ detailId: number; dispatchedAt: Date }>,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma
  const results = []

  for (const item of items) {
    const updated = await db.dinerRequestDetail.update({
      where: { id: item.detailId },
      data: {
        dispatchedAt: item.dispatchedAt
      },
      select: {
        id: true,
        dispatchedAt: true
      }
    })
    results.push(updated)
  }

  return results
}
