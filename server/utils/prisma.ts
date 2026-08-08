import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// ── SINGLETON DE PRISMA ──────────────────────────────────────────────────────

// Prisma 7 requiere usar un adaptador (Driver Adapter) para la conexión a DB.
const connectionString = process.env.DATABASE_URL
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
})
const adapter = new PrismaPg(pool)

// Forzamos una nueva instancia siempre para evitar el caché de Nitro en dev
export const prisma = new PrismaClient({ adapter })