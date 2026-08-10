import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SQUADS = [
  'ADMINISTRATIVO',
  'CUARENTENA',
  'CUADRILLA A',
  'CUADRILLA B',
  'CUADRILLA C',
  'CUADRILLA D',
  'CUADRILLA E',
  'CUADRILLA F',
  'DIURNO OPERATIVO A',
  'DIURNO OPERATIVO B',
  'DIURNO OPERATIVO C',
  'DIURNO OPERATIVO D'
]

async function main() {
  console.log('Iniciando carga de cuadrillas en la base de datos...')
  for (const name of SQUADS) {
    await prisma.squad.upsert({
      where: { name },
      update: {},
      create: { name }
    })
    console.log(`✅ Cuadrilla registrada: ${name}`)
  }
  console.log('¡Carga de cuadrillas finalizada con éxito!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
