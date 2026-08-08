import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  
  const users = await prisma.user.findMany({
    include: {
      role: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // No devolver passwordHash al frontend
  return users.map(({ passwordHash, ...user }) => user)
})
