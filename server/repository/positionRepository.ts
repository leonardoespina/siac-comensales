import { prisma } from '../utils/prisma'
import { Prisma } from '@prisma/client'

export const positionRepository = {
  async findAll() {
    return prisma.position.findMany({
      orderBy: { name: 'asc' }
    })
  },

  async findById(id: number) {
    return prisma.position.findUnique({
      where: { id }
    })
  },

  async findByName(name: string) {
    return prisma.position.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' }
      }
    })
  },

  async create(data: { name: string; active?: boolean }) {
    return prisma.position.create({
      data
    })
  },

  async update(id: number, data: Partial<{ name: string; active: boolean }>) {
    return prisma.position.update({
      where: { id },
      data
    })
  },

  async delete(id: number) {
    // Check if diners are using this position
    const dinersCount = await prisma.diner.count({
      where: { positionId: id }
    })

    if (dinersCount > 0) {
      throw new Error(`Cannot delete position. It is assigned to ${dinersCount} diners.`)
    }

    return prisma.position.delete({
      where: { id }
    })
  }
}
