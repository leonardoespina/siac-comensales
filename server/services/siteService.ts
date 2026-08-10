import { SiteRepository } from '../repository/siteRepository'
import { ValidationError, ConflictError } from '../domain/errors'
import * as diningRoomRepo from '../repository/diningRoomRepository'

export class SiteService {
  static async getAllSites(includeInactive: boolean = false) {
    return SiteRepository.findAll(includeInactive)
  }

  static async createSite(data: { name: string, description?: string }) {
    if (!data.name) {
      throw new ValidationError('El nombre de la sede es requerido')
    }
    return SiteRepository.create(data)
  }

  static async updateSite(id: number, data: { name: string, description?: string, active?: boolean }) {
    if (!data.name) {
      throw new ValidationError('El nombre de la sede es requerido')
    }
    return SiteRepository.update(id, data)
  }

  static async toggleSiteStatus(id: number, active: boolean) {
    if (!active) {
      const activeDiningRooms = await diningRoomRepo.countActiveBySite(id)
      if (activeDiningRooms > 0) {
        throw new ConflictError('Sede', `No se puede desactivar la Sede porque tiene ${activeDiningRooms} comedor(es) activo(s).`)
      }
    }
    return SiteRepository.update(id, { active })
  }
}
