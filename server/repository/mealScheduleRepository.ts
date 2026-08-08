import { prisma } from '../utils/prisma'

export const mealScheduleRepository = {
  async findAll() {
    return prisma.mealSchedule.findMany({
      orderBy: { startTime: 'asc' }
    })
  },

  async findByShiftType(shiftType: string) {
    return prisma.mealSchedule.findUnique({
      where: { shiftType }
    })
  },

  async create(data: { shiftType: string; startTime: string; endTime: string; active: boolean }) {
    return prisma.mealSchedule.create({ data })
  },

  async update(id: number, data: any) {
    return prisma.mealSchedule.update({
      where: { id },
      data
    })
  },

  async delete(id: number) {
    return prisma.mealSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), active: false }
    })
  }
}
