import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔧 Iniciando corrección de permisos para el módulo DINERS...')

  // 1. Asegurar que el módulo exista
  const dinersModule = await prisma.module.upsert({
    where: { code: 'DINERS' },
    update: { name: 'Directorio de Comensales' },
    create: { code: 'DINERS', name: 'Directorio de Comensales' }
  })
  console.log(`✅ Módulo asegurado: ${dinersModule.code} (ID: ${dinersModule.id})`)

  // 2. Obtener todos los roles del sistema (sin hardcodear nombres)
  const allRoles = await prisma.role.findMany()
  console.log(`🔍 Se encontraron ${allRoles.length} roles en el sistema.`)

  // 3. Asignar permisos a cada rol
  // Nota: Al usar buenas prácticas, la seguridad se basa en la tabla RolePermission.
  // Otorgaremos CRUD completo por defecto, ya que la API aísla los datos por subdependencia de forma segura.
  // El Administrador global luego puede quitar este permiso desde la UI si algún rol no debe tenerlo.
  let assignedCount = 0
  for (const role of allRoles) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: role.id,
          moduleId: dinersModule.id
        }
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true
      },
      create: {
        roleId: role.id,
        moduleId: dinersModule.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true
      }
    })
    assignedCount++
  }

  console.log(`✅ Permisos de DINERS otorgados a ${assignedCount} roles exitosamente.`)
  console.log('🚀 Corrección terminada. Pedro Pérez ya no debería tener error 403.')
}

main()
  .catch((e) => {
    console.error('❌ Error durante la corrección:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
