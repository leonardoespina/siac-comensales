import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 INICIANDO RESET DE INVENTARIO Y CATÁLOGOS...')

  // 1. Borrar Detalles y Transacciones (Recepciones, Transferencias, Despachos)
  console.log('Borrando Detalles de Transacciones...')
  await prisma.transactionDetail.deleteMany()
  
  console.log('Borrando Transacciones (Recepciones, Transferencias)...')
  await prisma.transaction.deleteMany()

  // 2. Borrar Inventario (Stock actual)
  console.log('Borrando Inventarios (Stock)...')
  await prisma.stock.deleteMany()

  // 3. Borrar Catálogos
  console.log('Borrando Productos...')
  await prisma.product.deleteMany()

  console.log('Borrando Categorías...')
  await prisma.category.deleteMany()

  console.log('Borrando Unidades...')
  await prisma.unit.deleteMany()

  console.log('✅ ¡Reset completado! Las tablas solicitadas quedaron en 0.')
  console.log('👉 Se preservaron los Comensales, Usuarios, Proveedores y Almacenes intactos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
