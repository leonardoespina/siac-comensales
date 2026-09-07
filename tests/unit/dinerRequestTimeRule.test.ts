import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

// Mock de Prisma y dependencias para prueba unitaria pura
vi.mock('../../server/utils/prisma', () => ({
  prisma: {}
}))

vi.mock('../../server/repository/dinerRequestRepository', () => ({
  dinerRequestRepository: {}
}))

vi.mock('../../server/repository/dependencyRepository', () => ({
  dependencyRepository: {}
}))

import { dinerRequestService } from '../../server/services/dinerRequestService'
import { settingService } from '../../server/services/settingService'

describe('dinerRequestService.validateTimeRule - Reglas de Tiempo y Anticipación', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(settingService, 'getMinDaysAhead').mockResolvedValue(1)
    vi.spyOn(settingService, 'getCutoffTime').mockResolvedValue({ hours: 23, minutes: 59 })
  })

  afterEach(() => {
    delete process.env.MOCK_TIME
  })

  describe('Usuarios Administradores (hasGlobalBypass = true)', () => {
    it('debería permitir registrar fechas pasadas (carga histórica post-mantenimiento)', async () => {
      const pastDate = dayjs().subtract(5, 'day').format('YYYY-MM-DD')
      const result = await dinerRequestService.validateTimeRule(pastDate, 'CREATE', true)
      expect(result).toBe(true)
    })

    it('debería permitir registrar la fecha de hoy', async () => {
      const today = dayjs().format('YYYY-MM-DD')
      const result = await dinerRequestService.validateTimeRule(today, 'CREATE', true)
      expect(result).toBe(true)
    })

    it('debería permitir registrar fechas futuras a más de 5 días', async () => {
      const farFuture = dayjs().add(15, 'day').format('YYYY-MM-DD')
      const result = await dinerRequestService.validateTimeRule(farFuture, 'CREATE', true)
      expect(result).toBe(true)
    })
  })

  describe('Usuarios No-Administradores (hasGlobalBypass = false)', () => {
    it('debería rechazar fechas pasadas con TIME_RULE_VIOLATION', async () => {
      const pastDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
      await expect(
        dinerRequestService.validateTimeRule(pastDate, 'CREATE', false)
      ).rejects.toThrowError(/Las solicitudes o sus modificaciones generales solo pueden realizarse desde 1 hasta un máximo de 5 días/)
    })

    it('debería rechazar la fecha de hoy si minDaysAhead = 1', async () => {
      const today = dayjs().format('YYYY-MM-DD')
      await expect(
        dinerRequestService.validateTimeRule(today, 'CREATE', false)
      ).rejects.toThrowError(/Las solicitudes o sus modificaciones generales solo pueden realizarse desde 1 hasta un máximo de 5 días/)
    })

    it('debería permitir fechas dentro de la ventana de 5 días (días 1 a 5)', async () => {
      // Mock de hora a las 08:00 AM para no chocar con cutoff
      process.env.MOCK_TIME = dayjs().hour(8).minute(0).toISOString()

      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const targetDate = dayjs().add(dayOffset, 'day').format('YYYY-MM-DD')
        const result = await dinerRequestService.validateTimeRule(targetDate, 'CREATE', false)
        expect(result).toBe(true)
      }
    })

    it('debería rechazar fechas mayores a 5 días de anticipación (ej. día 6)', async () => {
      process.env.MOCK_TIME = dayjs().hour(8).minute(0).toISOString()
      const day6 = dayjs().add(6, 'day').format('YYYY-MM-DD')
      await expect(
        dinerRequestService.validateTimeRule(day6, 'CREATE', false)
      ).rejects.toThrowError(/Las solicitudes o sus modificaciones generales solo pueden realizarse desde 1 hasta un máximo de 5 días/)
    })

    it('debería rechazar el primer día si ya venció la hora de corte', async () => {
      vi.spyOn(settingService, 'getCutoffTime').mockResolvedValue({ hours: 10, minutes: 0 })
      // Simular que son las 10:30 AM
      process.env.MOCK_TIME = dayjs().hour(10).minute(30).toISOString()

      const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
      await expect(
        dinerRequestService.validateTimeRule(tomorrow, 'CREATE', false)
      ).rejects.toThrowError(/El tiempo límite para crear, editar o anular solicitudes para la fecha/)
    })
  })
})
