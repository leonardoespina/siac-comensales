import { prisma } from '../utils/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function findMassiveRequests(diningRoomId: number | undefined, dateStr: string, dependencyId?: number | null, subdependencyId?: number | null) {
  // Al usar Prisma con columnas @db.Date, Prisma extrae la fecha UTC del objeto Date.
  // Si usamos dayjs.tz('America/Caracas').endOf('day'), la hora local 23:59:59 se traduce a 03:59:59 UTC del día SIGUIENTE.
  // Prisma toma ese día siguiente (ej. 19) y hace la consulta <= '2026-08-19', incluyendo solicitudes de mañana.
  // SOLUCION: Usamos fechas UTC estrictas para que Prisma extraiga exactamente el string de fecha correcto.
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

  // El campo targetSubdependencyId está directamente en DinerRequest.
  // Filtrar por él es directo, eficiente y semánticamente correcto.
  // No es necesario navegar por details.diner.subdependencyId.
  const requestFilter: Record<string, unknown> = {}
  if (subdependencyId) {
    requestFilter.targetSubdependencyId = subdependencyId
  } else if (dependencyId) {
    requestFilter.targetSubdependency = { dependencyId }
  }

  const massiveRequests = await prisma.dinerRequest.findMany({
    where: {
      diningRoomId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'APPROVED',
      deletedAt: null,
      ...requestFilter,
      details: {
        some: { modality: 'TAKE_AWAY' }
      }
    },
    include: {
      createdBy: {
        include: { subdependency: { include: { dependency: true } } }
      },
      details: {
        where: { modality: 'TAKE_AWAY' },
        include: { diner: { include: { subdependency: { include: { dependency: true } } } } }
      }
    }
  })

  return massiveRequests
}


export async function getMassiveRequestById(batchId: number) {
  return await prisma.dinerRequest.findUnique({
    where: { id: batchId },
    include: {
      createdBy: {
        include: { 
          dependency: true,
          subdependency: { include: { dependency: true } } 
        }
      },
      details: {
        where: { modality: 'TAKE_AWAY' },
        include: { diner: { include: { subdependency: { include: { dependency: true } } } } }
      }
    }
  })
}

export async function executeBatchDispatch(batchId: number, operatorId: number, receiverCedula: string) {
  const now = new Date()
  await prisma.dinerRequestDetail.updateMany({
    where: {
      requestId: batchId,
      modality: 'TAKE_AWAY',
      dispatchedAt: null
    },
    data: {
      dispatchedAt: now,
      dispatchedById: operatorId,
      receiverCedula: receiverCedula
    }
  })
}

// Para buscar comensal o usuario autorizado
export async function findWorkerOrDiner(cedula: string) {
  const numericCedula = cedula.replace(/\D/g, '')
  const cedulaVariants = Array.from(new Set([
    cedula,
    numericCedula,
    `V-${numericCedula}`,
    `E-${numericCedula}`,
    `V${numericCedula}`,
    `E${numericCedula}`
  ])).filter(Boolean)

  const diner = await prisma.diner.findFirst({
    where: {
      cedula: { in: cedulaVariants }
    },
    include: {
      subdependency: {
        include: { dependency: true }
      }
    }
  })

  const workerUser = await prisma.user.findFirst({
    where: {
      cedula: { in: cedulaVariants }
    },
    include: {
      dependency: true,
      subdependency: {
        include: { dependency: true }
      },
      role: true
    }
  })

  if (diner || workerUser) {
    return {
      diner,
      workerUser
    }
  }

  return null
}