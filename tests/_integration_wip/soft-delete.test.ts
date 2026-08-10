import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../server/utils/prisma'
import { SiteService } from '../../server/services/siteService'
import * as diningRoomRepo from '../../server/repository/diningRoomRepository'
import { AppError } from '../../server/domain/errors'

describe('Soft Delete & Integrity Shields', () => {
  let testSiteId: number
  let testDiningRoomId: number

  beforeAll(async () => {
    // 1. Crear una sede de prueba
    const site = await prisma.site.create({
      data: {
        name: 'Test QA Soft-Delete Site',
        description: 'Sede temporal para pruebas de Soft Delete',
        active: true
      }
    })
    testSiteId = site.id

    // 2. Crear un comedor activo dentro de la sede
    const diningRoom = await diningRoomRepo.createDiningRoom('Comedor QA', testSiteId)
    testDiningRoomId = diningRoom.id
  })

  afterAll(async () => {
    // Cleanup: eliminamos físicamente los datos de prueba al terminar
    // ya que estamos testeando el motor y no queremos ensuciar la DB
    try {
      await prisma.diningRoom.deleteMany({ where: { siteId: testSiteId } })
      await prisma.site.deleteMany({ where: { id: testSiteId } })
    } catch (e) {
      console.error('Error in cleanup:', e)
    }
  })

  it('debería BLOQUEAR el soft-delete de una Sede si tiene Comedores ACTIVOS', async () => {
    // Intentamos desactivar la sede pasando active = false
    await expect(
      SiteService.toggleSiteStatus(testSiteId, false)
    ).rejects.toThrowError(AppError)
  })

  it('debería PERMITIR el soft-delete de una Sede si sus Comedores están INACTIVOS', async () => {
    // 1. Desactivamos el comedor (soft-delete)
    await diningRoomRepo.toggleStatus(testDiningRoomId, false)
    
    // 2. Ahora sí intentamos desactivar la Sede
    await SiteService.toggleSiteStatus(testSiteId, false)

    // 3. Verificamos que realmente se actualizó a active = false
    const updatedSite = await prisma.site.findUnique({ where: { id: testSiteId } })
    expect(updatedSite).not.toBeNull()
    expect(updatedSite?.active).toBe(false)
  })
})
