import 'dotenv/config'
import { emitEvent, eventBus } from './server/utils/eventBus'
import { prisma } from './server/utils/prisma'

// Mock de variables globales de Nuxt Nitro
;(global as any).defineNitroPlugin = (fn: any) => fn;

async function main() {
  console.log('--- Inicializando Plugins ---')
  
  // Se eliminó el mock de socketModule porque el módulo ES es de solo lectura.
  // El código maneja el caso de que `io` no exista gracias a los check `if (io)`.

  const dinerPlugin = (await import('./server/plugins/02.dinerEvents')).default
  const inventoryPlugin = (await import('./server/plugins/01.inventoryEvents')).default

  dinerPlugin(null as any)
  inventoryPlugin(null as any)
  
  // 1. Encontrar un usuario para simular (idealmente uno de área o dependencia)
  const testUser = await prisma.user.findFirst({
    where: { active: true, role: { name: { not: 'Administrador Global' } } }
  }) || await prisma.user.findFirst();
  
  if (!testUser) {
    console.log('No hay usuarios en la DB para probar.');
    return;
  }
  console.log(`[Test] Usuario simulando ser creador: ID ${testUser.id} - Área: ${testUser.subdependencyId}`);

  // Limpiar notificaciones previas de test
  await prisma.notification.deleteMany({ where: { link: '/diners/requests', message: { contains: '9999' } } });

  console.log('\n--- Emitiendo evento: dinerRequest:created ---')
  // Recordatorio: en dinerService emitimos subdependencyId enviando el id del usuario (supervisorId)
  emitEvent('dinerRequest:created', { requestId: 9999, subdependencyId: testUser.id })

  // Esperar a que el event loop y las promesas del listener asíncrono se resuelvan
  await new Promise(r => setTimeout(r, 2000))

  console.log('\n--- Revisando la Base de Datos de Notificaciones ---')
  const generatedNotifs = await prisma.notification.findMany({
    where: { link: '/diners/requests', message: { contains: '9999' } }
  })
  
  if (generatedNotifs.length > 0) {
    console.log(`✅ ¡ÉXITO! Se generaron ${generatedNotifs.length} notificaciones en la DB:`)
    generatedNotifs.forEach(n => {
      console.log(`   -> Para Usuario ID: ${n.userId} | Título: ${n.title} | Mensaje: ${n.message}`)
    })
  } else {
    console.log('⚠️ No se generaron notificaciones. Probablemente no hay usuarios aprobadores para esa área, o la regla falló.')
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
