import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const { Pool } = pg

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient
  pgPool: pg.Pool 
}

const pool = globalForPrisma.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pgPool = pool
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(pool)
  globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma