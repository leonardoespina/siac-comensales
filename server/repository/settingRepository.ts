import { prisma } from '../utils/prisma'
import type { SystemSetting } from '@prisma/client'

export const settingRepository = {
  async findAll(): Promise<SystemSetting[]> {
    return prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    })
  },

  async findByKey(key: string): Promise<SystemSetting | null> {
    return prisma.systemSetting.findUnique({
      where: { key }
    })
  },

  async update(key: string, value: string): Promise<SystemSetting> {
    return prisma.systemSetting.update({
      where: { key },
      data: { value }
    })
  }
}
