import { prisma } from '../utils/prisma'
import type { DinerRequest, DinerRequestDetail } from '@prisma/client'

export const dinerRequestRepository = {
  
  async findAllByDateRange(startDate: Date, endDate: Date, filterDependencyId?: number | null, filterSubdependencyIds?: number[] | number | null, includeDeleted: boolean = false) {
    const subIds = Array.isArray(filterSubdependencyIds) 
      ? filterSubdependencyIds 
      : (filterSubdependencyIds ? [filterSubdependencyIds] : [])

    return prisma.dinerRequest.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(subIds.length > 0 ? {
          details: {
            some: {
              diner: {
                subdependencyId: { in: subIds }
              }
            }
          }
        } : filterDependencyId ? {
          details: {
            some: {
              diner: {
                subdependency: {
                  dependencyId: filterDependencyId
                }
              }
            }
          }
        } : {})
      },
      include: {
        createdBy: { select: { name: true, cedula: true } },
        diningRoom: { select: { name: true } },
        targetSubdependency: { select: { id: true, dependencyId: true } },
        details: {
          include: {
            diner: { select: { cedula: true, name: true, rationType: true, subdependencyId: true, squadId: true, subdependency: { select: { dependencyId: true } } } }
          }
        }
      },
      orderBy: { date: 'asc' }
    })
  },

  async findById(id: number) {
    return prisma.dinerRequest.findUnique({
      where: { id },
      include: {
        details: true
      }
    })
  },

  async findOverlappingDiners(date: Date, shiftType: string, dinerIds: number[]) {
    // Busca detalles de peticiones individuales (DINE_IN) existentes para los comensales dados en el día y turno específicos.
    // IGNORA las solicitudes que han sido eliminadas lógicamente (Soft Delete) y las autorizaciones masivas (TAKE_AWAY).
    return prisma.dinerRequestDetail.findMany({
      where: {
        dinerId: { in: dinerIds },
        modality: 'DINE_IN',
        request: {
          date: date,
          shiftType: shiftType,
          deletedAt: null
        }
      },
      include: {
        request: true,
        diner: true
      }
    })
  },

  async createWithDetails(data: Omit<DinerRequest, 'id' | 'createdAt' | 'updatedAt'>, dinersInput: { id: number, quantity: number, modality?: string }[]) {
    // Uso de transacciones interactivas para garantizar atomicidad
    return prisma.$transaction(async (tx) => {
      
      // 1. Crear el encabezado de la solicitud
      const request = await tx.dinerRequest.create({
        data: {
          date: data.date,
          shiftType: data.shiftType,
          status: data.status || 'PENDING',
          batchCode: data.batchCode,
          createdById: data.createdById,
          approvedById: data.approvedById,
          diningRoomId: data.diningRoomId,
          targetSubdependencyId: data.targetSubdependencyId
        }
      })

      // 2. Buscar los datos de dieta de cada comensal para arrastrar el rationType
      const dinerIds = dinersInput.map(d => d.id)
      const diners = await tx.diner.findMany({
        where: { id: { in: dinerIds } },
        select: { id: true, rationType: true }
      })

      // 3. Crear los detalles masivos
      const detailsData = diners.map(diner => {
        const input = dinersInput.find(di => di.id === diner.id)
        const qty = input?.quantity || 1
        // Si la cantidad es mayor a 1 (lote masivo/viandas), la ración del lote por defecto es NORMAL,
        // reservando DIETA únicamente para consumos individuales (qty === 1) con perfil de dieta.
        const effectiveRationType = qty > 1 ? 'NORMAL' : (diner.rationType || 'NORMAL')

        return {
          requestId: request.id,
          dinerId: diner.id,
          rationType: effectiveRationType,
          modality: input?.modality || 'DINE_IN',
          quantity: qty
        }
      })

      await tx.dinerRequestDetail.createMany({
        data: detailsData
      })

      return tx.dinerRequest.findUnique({
        where: { id: request.id },
        include: { details: true }
      })
    })
  },

  async updateStatus(id: number, status: string, approvedById?: number) {
    return prisma.dinerRequest.update({
      where: { id },
      data: { status, approvedById }
    })
  },

  async deleteWithDetails(id: number) {
    // Soft Delete
    return prisma.dinerRequest.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  },

  async deleteManyWithDetails(ids: number[]) {
    // Soft Delete Masivo
    return prisma.dinerRequest.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() }
    })
  },

  async findManyByIds(ids: number[]) {
    return prisma.dinerRequest.findMany({
      where: { id: { in: ids } }
    })
  }

}
