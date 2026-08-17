import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('⚙️ Iniciando configuración de System Settings...')

  const settingsData = [
    { 
      key: 'REQUEST_CUTOFF_TIME', 
      value: '10:30', 
      description: 'Hora límite para modificar solicitudes del día siguiente (formato HH:mm)' 
    },
    { 
      key: 'REQUEST_MIN_DAYS_AHEAD', 
      value: '1', 
      description: 'Días mínimos de anticipación requeridos para una solicitud regular' 
    }
  ]

  for (const setting of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {}, // Keep existing value if already set
      create: setting
    })
  }

  console.log('✅ Configuraciones globales (Settings) creadas exitosamente.')
}

main()
  .catch((e) => {
    console.error('❌ Error configurando settings:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
