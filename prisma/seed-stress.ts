import { config } from 'dotenv'
import { resolve } from 'path'
// Cargamos el .env explícitamente para el adaptador de postgres
config({ path: resolve(process.cwd(), '.env') })

// Importamos prisma dinámicamente para asegurar que dotenv cargó las variables antes
const { prisma } = await import('../server/utils/prisma')

async function main() {
  console.log('Iniciando Prueba de Estrés: Multi-División + 50 Trabajadores...')

  // 1. Localizar el Ancla
  const leonardo = await prisma.diner.findUnique({
    where: { cedula: '18073921' },
    include: { subdependency: true }
  })

  if (!leonardo || !leonardo.subdependencyId) {
    console.error('No se encontró a Leonardo Espina o no tiene subdependencia asignada.')
    return
  }

  const parentDependencyId = leonardo.subdependency!.dependencyId
  console.log(`Ancla encontrada. Subdependencia Base ID: ${leonardo.subdependencyId}. Dependencia Padre ID: ${parentDependencyId}`)

  // 2. Obtener o crear las divisiones de prueba
  console.log('Obteniendo o creando divisiones (Subdependencias)...')
  const subdepNames = [
    'División de Redes (Prueba)',
    'División de Soporte Técnico (Prueba)',
    'División de Infraestructura (Prueba)'
  ]
  const targetSubdeps: any[] = []

  for (const name of subdepNames) {
    let sub = await prisma.subdependency.findFirst({
      where: { name, dependencyId: parentDependencyId }
    })
    if (!sub) {
      sub = await prisma.subdependency.create({
        data: { name, dependencyId: parentDependencyId }
      })
      console.log(`✅ Subdependencia creada: ${name}`)
    } else {
      console.log(`ℹ️ Subdependencia existente encontrada: ${name}`)
    }
    targetSubdeps.push(sub)
  }

  // Consolidamos todas las subdependencias posibles (la original + las 3 de prueba)
  const allTargetSubdeps = [leonardo.subdependencyId, ...targetSubdeps.map(s => s.id)]

  // 3. Cargar Cuadrillas (Squads)
  const squads = await prisma.squad.findMany()
  if (squads.length === 0) {
    console.error('No hay cuadrillas registradas en el sistema. Crea al menos una antes de ejecutar este script.')
    return
  }

  // 4. Inyección de 950 Trabajadores Simulados
  console.log('Inyectando 950 trabajadores...')
  let injectedCount = 0

  for (let i = 1; i <= 950; i++) {
    // Generar datos aleatorios consistentes
    const randomSubdepId = allTargetSubdeps[Math.floor(Math.random() * allTargetSubdeps.length)]
    const randomSquadId = squads[Math.floor(Math.random() * squads.length)].id
    const rationType = Math.random() > 0.8 ? 'DIET' : 'NORMAL' // 20% probabilidad de dieta
    
    // Cédula única secuencial para evitar colisiones en BD
    const cedulaFake = `95${String(i).padStart(6, '0')}`

    await prisma.diner.create({
      data: {
        cedula: cedulaFake,
        name: `Trabajador Masivo ${i}`,
        rationType: rationType,
        squadId: randomSquadId,
        subdependencyId: randomSubdepId,
        active: true
      }
    })
    injectedCount++
  }

  console.log(`\n¡Éxito! Se han inyectado ${injectedCount} trabajadores masivos.`)
  console.log('Distribución completada sobre la Dependencia Padre. Revisa la UI.')
}

main()
  .catch((e) => {
    console.error('Error durante la inyección:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
