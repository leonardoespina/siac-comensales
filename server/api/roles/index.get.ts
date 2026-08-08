import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { module: true }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  return roles
})
