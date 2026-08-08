import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireUserContext, hasGlobalAccess } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const query = getQuery(event)
  let warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined

  // Seguridad: Forzar filtro si no es global
  if (!hasGlobalAccess(user)) {
    warehouseId = user.warehouseId!
  }
  const dateStr = query.date as string

  // Filtros dinámicos
  const whereClause: any = {}
  
  if (warehouseId) {
    whereClause.warehouseId = warehouseId
  }

  if (dateStr) {
    // Buscar todos los turnos que hayan empezado o terminado en esa fecha
    // Buscar todos los turnos que hayan empezado o terminado en esa fecha
    // Solución al problema de Zona Horaria (UTC vs Local)
    const parts = dateStr.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)

    whereClause.startTime = {
      gte: startDate,
      lte: endDate
    }
  }

  const shifts = await prisma.shift.findMany({
    where: whereClause,
    include: {
      warehouse: true,
      user: { select: { name: true } },
      transactions: {
        where: { type: { in: ['CONSUMPTION', 'LOSS', 'SUPPORT'] } },
        include: {
          institution: true,
          details: {
            include: { product: { include: { unit: true } } }
          }
        }
      }
    },
    orderBy: { startTime: 'desc' }
  })

  return shifts
})
