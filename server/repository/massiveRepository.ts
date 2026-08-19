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

  const massiveRequests = await prisma.dinerRequest.findMany({
    where: {
      diningRoomId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'APPROVED',
      deletedAt: null,
      details: {
        some: {
          modality: 'TAKE_AWAY',
          diner: {
            subdependencyId: subdependencyId || undefined,
            subdependency: dependencyId ? { dependencyId: dependencyId } : undefined
          }
        }
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
        include: { subdependency: true }
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

// Para buscar "mulas"
export async function findWorkerOrDiner(cedula: string) {
  const workerUser = await prisma.user.findUnique({ 
    where: { cedula }, 
    include: { dependency: true } 
  })
  if (workerUser) return { type: 'WORKER', data: workerUser }

  const diner = await prisma.diner.findUnique({ 
    where: { cedula },
    include: { subdependency: { include: { dependency: true } } }
  })
  if (diner) return { type: 'DINER', data: diner }

  return null
}