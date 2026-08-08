import { prisma } from '../server/utils/prisma'

async function main() {
  const newModules = [
    { name: 'Estructura Organizacional', code: 'DEPENDENCIES' },
    { name: 'Cuadrillas', code: 'SQUADS' },
    { name: 'Comensales Físicos', code: 'DINERS' },
    { name: 'Peticiones de Comida', code: 'DINERS_REQUESTS' },
  ]

  for (const mod of newModules) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: {},
      create: mod
    })
    console.log(`✅ Module registered: ${mod.code}`)
  }

  // Opcional: Asignarle los permisos completos al Administrador Global
  const adminRole = await prisma.role.findFirst({ where: { isGlobal: true } })
  if (adminRole) {
    for (const mod of newModules) {
      const dbMod = await prisma.module.findUnique({ where: { code: mod.code } })
      if (dbMod) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_moduleId: {
              roleId: adminRole.id,
              moduleId: dbMod.id
            }
          },
          update: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
          create: {
            roleId: adminRole.id,
            moduleId: dbMod.id,
            canCreate: true, canRead: true, canUpdate: true, canDelete: true
          }
        })
      }
    }
    console.log(`✅ Permisos asignados al Administrador Global (${adminRole.name})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
