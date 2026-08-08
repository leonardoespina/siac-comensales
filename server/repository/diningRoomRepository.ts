import { prisma } from '../utils/prisma'

export async function listAll() {
  return await prisma.diningRoom.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function createDiningRoom(name: string) {
  return await prisma.diningRoom.create({
    data: {
      name: name.toUpperCase().trim()
    }
  })
}

export async function updateDiningRoom(id: number, name: string, active?: boolean) {
  return await prisma.diningRoom.update({
    where: { id },
    data: {
      name: name.toUpperCase().trim(),
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
