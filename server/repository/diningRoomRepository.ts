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

export interface DiningRoomDeviceInput {
  deviceIp?: string | null
  devicePort?: number
  deviceUser?: string | null
  devicePassword?: string | null
  deviceEnabled?: boolean
}

export async function createDiningRoom(name: string, siteId: number, deviceData?: DiningRoomDeviceInput) {
  return await prisma.diningRoom.create({
    data: {
      name: name.toUpperCase().trim(),
      siteId,
      deviceIp: deviceData?.deviceIp?.trim() || null,
      devicePort: deviceData?.devicePort || 443,
      deviceUser: deviceData?.deviceUser?.trim() || 'admin',
      devicePassword: deviceData?.devicePassword || null,
      deviceEnabled: deviceData?.deviceEnabled ?? true
    },
    include: { site: true }
  })
}

export async function updateDiningRoom(
  id: number,
  name: string,
  siteId: number,
  active?: boolean,
  deviceData?: DiningRoomDeviceInput
) {
  return await prisma.diningRoom.update({
    where: { id },
    data: {
      name: name.toUpperCase().trim(),
      siteId,
      ...(active !== undefined && { active }),
      ...(deviceData?.deviceIp !== undefined && { deviceIp: deviceData.deviceIp?.trim() || null }),
      ...(deviceData?.devicePort !== undefined && { devicePort: deviceData.devicePort }),
      ...(deviceData?.deviceUser !== undefined && { deviceUser: deviceData.deviceUser?.trim() || 'admin' }),
      ...(deviceData?.devicePassword !== undefined && { devicePassword: deviceData.devicePassword || null }),
      ...(deviceData?.deviceEnabled !== undefined && { deviceEnabled: deviceData.deviceEnabled })
    },
    include: { site: true }
  })
}

export async function getById(id: number) {
  return await prisma.diningRoom.findUnique({
    where: { id },
    include: { site: true }
  })
}

export async function listActiveTerminals() {
  return await prisma.diningRoom.findMany({
    where: {
      active: true,
      deviceEnabled: true,
      deviceIp: { not: null }
    },
    include: { site: true },
    orderBy: { id: 'asc' }
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
