import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const sqlPath = 'C:\\Users\\divisionprogramacion\\Documents\\siac\\dependencias.sql'
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`No se encontró el archivo SQL en: ${sqlPath}`)
    return
  }

  const content = fs.readFileSync(sqlPath, 'utf8')
  
  // Extraer las líneas de datos del bloque COPY
  const lines = content.split('\n')
  let isCopyBlock = false
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('COPY public.dependencias')) {
      isCopyBlock = true
      continue
    }
    // El bloque COPY termina con \.
    if (isCopyBlock && line.trim() === '\\.') {
      isCopyBlock = false
      break
    }
    if (isCopyBlock && line.trim() !== '') {
      dataLines.push(line)
    }
  }

  console.log(`Encontradas ${dataLines.length} dependencias en el SQL para inyectar al SIAC...`)

  for (const line of dataLines) {
    const columns = line.split('\t')
    if (columns.length < 2) continue

    const id = parseInt(columns[0], 10)
    const name = columns[1].trim()
    
    // Asumimos activo por defecto si no viene estatus
    let active = true
    if (columns.length >= 7) {
      active = columns[6].trim().toUpperCase() === 'ACTIVO'
    }

    try {
      // Upsert: Si el ID ya existe, lo actualiza (para no romper la tabla). Si no existe, lo crea.
      await prisma.dependency.upsert({
        where: { id: id },
        update: {
          name: name,
          active: active
        },
        create: {
          id: id,
          name: name,
          active: active
        }
      })
      console.log(`[OK] Adaptada e inyectada: [ID ${id}] ${name}`)
    } catch (error) {
      console.error(`[ERROR] Falló al inyectar: [ID ${id}] ${name}`, error)
    }
  }

  // Sincronizar la secuencia de la base de datos para que los próximos insert manuales no choquen con estos IDs
  try {
    await prisma.$executeRawUnsafe(`SELECT setval('dependencies_id_seq', (SELECT MAX(id) FROM dependencies));`)
    console.log('[OK] Secuencia autoincremental de la base de datos sincronizada.')
  } catch(e) {
    // Silencioso si falla
  }

  console.log('¡Adaptación y Migración Finalizada Exitosamente!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
