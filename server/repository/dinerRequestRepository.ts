import { prisma } from '../utils/prisma'
import type { DinerRequest, DinerRequestDetail } from '@prisma/client'

export const dinerRequestRepository = {
  
  async findAllByDateRange(startDate: Date, endDate: Date) {
    return prisma.dinerRequest.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        createdBy: { select: { name: true, cedula: true } },
        diningRoom: { select: { name: true } },
        details: {
          include: {
            diner: { select: { cedula: true, name: true, rationType: true } }
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
    // Busca detalles de peticiones existentes para los comensales dados en el día y turno específicos
    return prisma.dinerRequestDetail.findMany({
      where: {
        dinerId: { in: dinerIds },
        request: {
          date: date,
          shiftType: shiftType
        }
      },
      include: {
        diner: { select: { id: true, name: true, cedula: true } }
      }
    })
  },

  async createWithDetails(data: Omit<DinerRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvedById'>, dinerIds: number[]) {
    // Uso de transacciones interactivas para garantizar atomicidad
    return prisma.$transaction(async (tx) => {
      
      // 1. Crear el encabezado de la solicitud
      const request = await tx.dinerRequest.create({
        data: {
          date: data.date,
          shiftType: data.shiftType,
          status: data.status,
          batchCode: data.batchCode,
          isExtraordinary: data.isExtraordinary,
          createdById: data.createdById,
          diningRoomId: data.diningRoomId
        }
      })

      // 2. Buscar los datos de dieta de cada comensal para arrastrar el rationType
      const diners = await tx.diner.findMany({
        where: { id: { in: dinerIds } },
        select: { id: true, rationType: true }
      })

      // 3. Crear los detalles masivos
      const detailsData = diners.map(diner => ({
        requestId: request.id,
        dinerId: diner.id,
        rationType: diner.rationType, // Se arrastra automáticamente del perfil
        modality: 'DINE_IN' // Valor por defecto
      }))

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
    // Cascade delete is configured in DB, but just to be sure we delete explicitly or trust cascade.
    // Prisma schema has `onDelete: Cascade` on `DinerRequestDetail.requestId`.
    return prisma.dinerRequest.delete({
      where: { id }
    })
  }

}
