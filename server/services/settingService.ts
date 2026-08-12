import { settingRepository } from '../repository/settingRepository'
import { createError } from 'h3'

export const settingService = {
  async getAllSettings() {
    return settingRepository.findAll()
  },

  async getSetting(key: string) {
    const setting = await settingRepository.findByKey(key)
    if (!setting) {
      throw createError({ statusCode: 404, statusMessage: `Configuración ${key} no encontrada` })
    }
    return setting
  },

  // Método auxiliar para no estar parseando strings en cada parte del código
  async getCutoffTime(): Promise<{ hours: number; minutes: number }> {
    const setting = await settingRepository.findByKey('REQUEST_CUTOFF_TIME')
    const timeStr = setting?.value || '10:30' // Fallback por seguridad
    const [h, m] = timeStr.split(':').map(Number)
    return { hours: h, minutes: m }
  },

  async getMinDaysAhead(): Promise<number> {
    const setting = await settingRepository.findByKey('REQUEST_MIN_DAYS_AHEAD')
    return parseInt(setting?.value || '1', 10)
  },

  async updateSettings(settings: { key: string; value: string }[]) {
    // Validar formato de hora antes de guardar
    for (const item of settings) {
      if (item.key === 'REQUEST_CUTOFF_TIME') {
        if (!/^\d{2}:\d{2}$/.test(item.value)) {
          throw createError({ statusCode: 400, statusMessage: 'El formato de hora debe ser HH:mm' })
        }
      }
      if (item.key === 'REQUEST_MIN_DAYS_AHEAD') {
        const val = parseInt(item.value, 10)
        if (isNaN(val) || val < 0) {
          throw createError({ statusCode: 400, statusMessage: 'Los días de anticipación deben ser un número válido' })
        }
      }
      await settingRepository.update(item.key, item.value)
    }
    return this.getAllSettings()
  }
}
