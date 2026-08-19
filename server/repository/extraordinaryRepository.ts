import { prisma } from '../utils/prisma'
import dayjs from 'dayjs'

export async function createExtraordinaryDispatch(data: any) {
  return await prisma.extraordinaryDispatch.create({
    data: {
      date: new Date(`${data.date}T12:00:00.000Z`), // Safe UTC date
      shiftType: data.shiftType,
      diningRoomId: data.diningRoomId,
      companyName: data.companyName,
      personId: data.personId,
      quantity: data.quantity,
      dependencyId: data.dependencyId || null,
      observation: data.observation || null,
      modality: data.modality || 'DINE_IN',
      dispatchedById: data.dispatchedById
    },
    include: {
      diningRoom: true,
      dependency: true,
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    }
  })
}

export async function getExtraordinaryDispatches(dateStr: string, diningRoomId?: number) {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

  const whereClause: any = {
    date: {
      gte: startOfDay,
      lte: endOfDay
    },
    deletedAt: null // Only show active records
  }

  if (diningRoomId) {
    whereClause.diningRoomId = diningRoomId
  }

  return await prisma.extraordinaryDispatch.findMany({
    where: whereClause,
    include: {
      diningRoom: true,
      dependency: true,
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: {
      dispatchedAt: 'desc'
    }
  })
}

export async function findRecentVisitorByNameOrId(query: string) {
  return await prisma.extraordinaryDispatch.findFirst({
    where: {
      OR: [
        { personId: { contains: query } },
        { companyName: { contains: query } }
      ],
      deletedAt: null
    },
    orderBy: {
      date: 'desc'
    },
    select: {
      personId: true,
      companyName: true
    }
  })
}

export async function updateExtraordinaryDispatch(id: number, data: any) {
  return await prisma.extraordinaryDispatch.update({
    where: { id },
    data: {
      date: data.date ? new Date(`${data.date}T12:00:00.000Z`) : undefined,
      shiftType: data.shiftType,
      diningRoomId: data.diningRoomId,
      companyName: data.companyName,
      personId: data.personId,
      quantity: data.quantity,
      dependencyId: data.dependencyId || null,
      observation: data.observation || null,
      modality: data.modality
    },
    include: {
      diningRoom: true,
      dependency: true,
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    }
  })
}

export async function deleteExtraordinaryDispatch(id: number) {
  // Soft delete
  return await prisma.extraordinaryDispatch.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}
