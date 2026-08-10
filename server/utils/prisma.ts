import { PrismaClient } from '@prisma/client'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pg = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

const PoolClass = pg.default ? pg.default.Pool || pg.Pool : pg.Pool

const pool = new (PoolClass as any)({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
})
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })