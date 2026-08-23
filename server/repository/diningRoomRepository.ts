import { prisma } from '../utils/prisma'

export async function listAll(includeInactive: boolean = false, siteIds?: number[]) {
  return await prisma.diningRoom.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(siteIds && siteIds.length > 0 ? { siteId: { in: siteIds } } : {})
    },
    include: { site: true },
    orderBy: { name: 'asc' }
  })
}

export async function createDiningRoom(name: string, siteId: number) {
  return await prisma.diningRoom.create({
    data: {
      name: name.toUpperCase().trim(),
      siteId
    }
  })
}

export async function updateDiningRoom(id: number, name: string, siteId: number, active?: boolean) {
  return await prisma.diningRoom.update({
    where: { id },
    data: {
      name: name.toUpperCase().trim(),
      siteId,
      ...(active !== undefined && { active })
    }
  })
}

export async function toggleStatus(id: number, active: boolean) {
  return await prisma.diningRoom.update({
    where: { id },
    data: { active }
  })
}

export async function countActiveBySite(siteId: number) {
  return await prisma.diningRoom.count({
    where: { siteId, active: true }
  })
}
