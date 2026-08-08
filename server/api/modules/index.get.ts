import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  // Solo usuarios logueados pueden ver los módulos
  await requireAuth(event)
  
  const modules = await prisma.module.findMany({
    orderBy: { name: 'asc' }
  })
  
  return modules
})
