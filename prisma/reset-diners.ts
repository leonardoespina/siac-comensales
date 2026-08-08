import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 INICIANDO PURGA TRANSACCIONAL (RESET A CERO)...')

  // 1. Borrar Peticiones de Comensales
  console.log('Borrado detalles de peticiones de comensales...')
  await prisma.dinerRequestDetail.deleteMany()
  console.log('Borrado peticiones de comensales...')
  await prisma.dinerRequest.deleteMany()



  // 5. Borrar notificaciones y auditoría (tienen referencias a usuarios)
  console.log('Borrando notificaciones y auditoría...')
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()

  // 6. (Omitido) Los usuarios, roles, almacenes y comedores se mantienen intactos.



  console.log('✅ ¡Purga completada exitosamente! El sistema está en 0, listo para pruebas con un solo usuario y sin catálogos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
