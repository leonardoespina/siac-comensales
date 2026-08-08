import { positionRepository } from '../repository/positionRepository'
import { createError } from 'h3'

export const positionService = {
  async getAllPositions() {
    return positionRepository.findAll()
  },

  async createPosition(data: { name: string; active?: boolean }) {
    if (!data.name || data.name.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'El nombre del cargo es obligatorio' })
    }

    const nameUpper = data.name.trim().toUpperCase()

    const existing = await positionRepository.findByName(nameUpper)
    if (existing) {
      throw createError({ statusCode: 400, statusMessage: 'Ya existe un cargo con este nombre' })
    }

    return positionRepository.create({
      name: nameUpper,
      active: data.active !== undefined ? data.active : true
    })
  },

  async updatePosition(id: number, data: { name?: string; active?: boolean }) {
    const existingPosition = await positionRepository.findById(id)
    if (!existingPosition) {
      throw createError({ statusCode: 404, statusMessage: 'Cargo no encontrado' })
    }

    const updateData: any = {}
    
    if (data.name) {
      const nameUpper = data.name.trim().toUpperCase()
      if (nameUpper !== existingPosition.name) {
        const existingName = await positionRepository.findByName(nameUpper)
        if (existingName) {
          throw createError({ statusCode: 400, statusMessage: 'Ya existe otro cargo con este nombre' })
        }
        updateData.name = nameUpper
      }
    }

    if (data.active !== undefined) {
      updateData.active = data.active
    }

    return positionRepository.update(id, updateData)
  },

  async deletePosition(id: number) {
    const existingPosition = await positionRepository.findById(id)
    if (!existingPosition) {
      throw createError({ statusCode: 404, statusMessage: 'Cargo no encontrado' })
    }

    try {
      await positionRepository.delete(id)
      return { success: true, message: 'Cargo eliminado correctamente' }
    } catch (error: any) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
  }
}
