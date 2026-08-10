import { prisma } from '../utils/prisma'

export class SiteRepository {
  static async findAll(includeInactive: boolean = false) {
    return prisma.site.findMany({
      where: {
        ...(includeInactive ? {} : { active: true })
      },
      orderBy: { name: 'asc' }
    })
  }

  static async findById(id: number) {
    return prisma.site.findUnique({
      where: { id }
    })
  }

  static async create(data: { name: string, description?: string }) {
    return prisma.site.create({ data })
  }

  static async update(id: number, data: { name?: string, description?: string, active?: boolean }) {
    return prisma.site.update({
      where: { id },
      data
    })
  }

  static async delete(id: number) {
    return prisma.site.update({
      where: { id },
      data: { active: false }
    })
  }
}
