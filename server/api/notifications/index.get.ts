import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50 // Traer solo las últimas 50
  })
})
