import { prisma } from '../server/utils/prisma'

async function main() {
  // 1. Crear Dependencia Principal
  const gerenciaGeneral = await prisma.dependency.upsert({
    where: { name: 'Gerencia General' },
    update: {},
    create: { name: 'Gerencia General' }
  })

  const gerenciaOperaciones = await prisma.dependency.upsert({
    where: { name: 'Gerencia de Operaciones' },
    update: {},
    create: { name: 'Gerencia de Operaciones' }
  })

  // 2. Crear Subdependencias
  const subs = [
    { name: 'Taller Mecánico', dependencyId: gerenciaOperaciones.id },
    { name: 'Mantenimiento de Planta', dependencyId: gerenciaOperaciones.id },
    { name: 'Recursos Humanos', dependencyId: gerenciaGeneral.id },
    { name: 'Tecnología', dependencyId: gerenciaGeneral.id }
  ]

  for (const sub of subs) {
    // Buscar si existe para no duplicar (ya que no tienen @unique en name)
    const exists = await prisma.subdependency.findFirst({ where: { name: sub.name } })
    if (!exists) {
      await prisma.subdependency.create({ data: sub })
      console.log(`✅ Subdependencia creada: ${sub.name}`)
    }
  }

  // 3. Crear Catálogo Maestro de Cuadrillas
  const squads = [
    { name: 'Cuadrilla A (Turno Mañana)' },
    { name: 'Cuadrilla B (Turno Tarde)' },
    { name: 'Cuadrilla C (Turno Noche)' },
    { name: 'Área Administrativa' },
  ]

  for (const squad of squads) {
    await prisma.squad.upsert({
      where: { name: squad.name },
      update: {},
      create: squad
    })
    console.log(`✅ Cuadrilla global agregada: ${squad.name}`)
  }

  console.log('🎉 Catálogo Global y Árbol Organizacional inyectados correctamente.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
