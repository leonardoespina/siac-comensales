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
      subdependencyId: data.subdependencyId || null,
      observation: data.observation || null,
      modality: data.modality || 'DINE_IN',
      dispatchedById: data.dispatchedById,
      status: 'PENDING'
    },
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: true,
      approver: {
        select: { id: true, name: true }
      },
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    }
  })
}

export async function findExtraordinaryById(id: number) {
  return await prisma.extraordinaryDispatch.findUnique({
    where: { id },
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: true
    }
  })
}

export async function getExtraordinaryDispatches(dateStr: string, diningRoomId?: number, userContext?: any) {
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

  if (userContext && !userContext.isGlobal) {
    const userSubIds: number[] = userContext.subdependencyIds || (userContext.subdependencyId ? [userContext.subdependencyId] : [])
    
    if (userSubIds.length > 0) {
      whereClause.OR = [
        { subdependencyId: { in: userSubIds } },
        { dispatchedById: userContext.id }
      ]
    } else if (userContext.dependencyId) {
      whereClause.OR = [
        { dependencyId: userContext.dependencyId },
        { subdependency: { dependencyId: userContext.dependencyId } },
        { dispatchedById: userContext.id }
      ]
    } else {
      whereClause.dispatchedById = userContext.id
    }
  }

  return await prisma.extraordinaryDispatch.findMany({
    where: whereClause,
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: true,
      approver: {
        select: { id: true, name: true }
      },
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: {
      dispatchedAt: 'desc'
    }
  })
}

export async function updateExtraordinaryDispatch(id: number, data: any) {
  const updateData: any = {
    personId: data.personId,
    companyName: data.companyName,
    modality: data.modality || 'DINE_IN',
    diningRoomId: data.diningRoomId,
    dependencyId: data.dependencyId || null,
    subdependencyId: data.subdependencyId || null,
    observation: data.observation || null,
    status: 'PENDING'
  }

  if (data.date) {
    updateData.date = new Date(`${data.date}T12:00:00.000Z`)
  }

  if (data.shifts && data.shifts.length > 0) {
    const targetShift = data.originalShiftType 
      ? data.shifts.find((s: any) => s.shiftType === data.originalShiftType) || data.shifts[0]
      : data.shifts[0];

    updateData.quantity = targetShift.quantity
    if (targetShift.shiftType) {
      updateData.shiftType = targetShift.shiftType
    }
  } else if (data.quantity !== undefined) {
    updateData.quantity = data.quantity
  }

  return await prisma.extraordinaryDispatch.update({
    where: { id },
    data: updateData,
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: true,
      approver: {
        select: { id: true, name: true }
      },
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
    }
  })
}

export async function updateExtraordinaryStatus(id: number, status: string, approvedById?: number) {
  return await prisma.extraordinaryDispatch.update({
    where: { id },
    data: {
      status,
      approvedById: approvedById || null,
      approvedAt: approvedById ? new Date() : null
    },
    include: {
      diningRoom: true,
      dependency: true,
      subdependency: true,
      approver: {
        select: { id: true, name: true }
      },
      dispatcher: {
        select: { id: true, name: true, role: true }
      }
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

export async function deleteExtraordinaryDispatch(id: number) {
  // Soft delete
  return await prisma.extraordinaryDispatch.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}
