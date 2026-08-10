import 'dotenv/config'
import { strict as assert } from 'assert'
import { prisma } from '../../server/utils/prisma'
import { SiteService } from '../../server/services/siteService'
import * as diningRoomRepo from '../../server/repository/diningRoomRepository'
import { ConflictError } from '../../server/domain/errors'

async function runTest() {
  console.log('🚀 Iniciando Test de Integración: Soft Delete y Escudos...')
  let testSiteId: number = 0;
  let testDiningRoomId: number = 0;

  try {
    // 1. Setup
    console.log('🔧 Configurando datos de prueba...')
    const site = await prisma.site.create({
      data: {
        name: 'Test QA Soft-Delete Site',
        description: 'Sede temporal para pruebas',
        active: true
      }
    })
    testSiteId = site.id
    const diningRoom = await diningRoomRepo.createDiningRoom('Comedor QA', testSiteId)
    testDiningRoomId = diningRoom.id

    // 2. Test 1: Bloqueo de Soft-Delete
    console.log('🛡️  Probando Escudo de Integridad de Sede...')
    let threwError = false
    try {
      await SiteService.toggleSiteStatus(testSiteId, false)
    } catch (error: any) {
      assert(error instanceof ConflictError, 'El error debe ser una instancia de ConflictError')
      assert(error.message.includes('No se puede desactivar la Sede'), 'El mensaje debe indicar el bloqueo por comedores')
      threwError = true
    }
    assert(threwError, 'Debería haber lanzado un error al intentar desactivar la Sede')
    console.log('✅ Escudo de Integridad funciona correctamente.')

    // 3. Test 2: Soft-Delete Exitoso
    console.log('🗑️  Probando Soft-Delete exitoso de Comedor y Sede...')
    await diningRoomRepo.toggleStatus(testDiningRoomId, false)
    await SiteService.toggleSiteStatus(testSiteId, false)

    const updatedSite = await prisma.site.findUnique({ where: { id: testSiteId } })
    assert.strictEqual(updatedSite?.active, false, 'La Sede debió ser marcada como inactiva')
    console.log('✅ Soft-Delete aplicado correctamente.')

    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE.')

  } catch (err) {
    console.error('❌ ERROR EN EL TEST:', err)
    process.exit(1)
  } finally {
    // Cleanup
    if (testSiteId) {
      console.log('🧹 Limpiando BD...')
      await prisma.diningRoom.deleteMany({ where: { siteId: testSiteId } })
      await prisma.site.deleteMany({ where: { id: testSiteId } })
    }
    await prisma.$disconnect()
  }
}

runTest()
