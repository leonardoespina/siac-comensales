import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const diner = await prisma.diner.findUnique({
    where: { cedula: '14073921' },
    include: { warehouse: true, subdependency: true }
  })
  console.log('--- DINER DATA ---')
  console.log(JSON.stringify(diner, null, 2))
}

main().finally(() => prisma.$disconnect())
