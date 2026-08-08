import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Configuración de conexión adaptada para la BD de comensales
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/siac_comensales'
console.log('Using connection string:', connectionString)
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const cargos = [
  'Analista',
  'Analista I',
  'Analista II',
  'Analista III',
  'Aprendiz INCES',
  'Asesor',
  'Asesor Mantenimiento',
  'Asesor Pequeña Minería',
  'Asistente Administrativo',
  'Auditor (A)',
  'Coordinador (A)',
  'Gerente',
  'Gerente (Encargado)',
  'Gerente / Jefe de División',
  'Jefe de División',
  'Jefe de División (Encargada) / Coordinador (A)',
  'Jefe de División (Encargado) / Coordinador (A)',
  'Jefe de División (Encargado) / Supervisor General I',
  'Obrero',
  'Obrero Calificado',
  'Obrero Calificado I',
  'Obrero Calificado / Supervisor General (Encargado)',
  'Obrero II',
  'Obrero II / Supervisor General (Encargado)',
  'Obrero III',
  'Obrero IV',
  'Obrero I',
  'Supervisor de Actividades y/o Tareas',
  'Supervisor General',
  'Supervisor General I',
  'Supervisor General / Jefe De División (Encargado)',
  'Técnico I',
  'Técnico II',
  'Técnico III',
  'Vicepresidente'
]

async function main() {
  console.log('Iniciando carga de cargos en la base de datos...')

  // Limpiamos duplicados exactos dentro del arreglo
  const cargosUnicos = [...new Set(cargos)]

  for (const nombre of cargosUnicos) {
    // Usamos upsert para evitar duplicados en la base de datos si corremos el script varias veces
    await prisma.position.upsert({
      where: { name: nombre },
      update: {}, // Si existe, no hace nada
      create: { 
        name: nombre,
        active: true 
      },
    })
    console.log(`✅ Cargo registrado: ${nombre}`)
  }

  console.log('¡Carga de cargos finalizada con éxito!')
}

main()
  .catch((e) => {
    console.error('Error durante la inserción:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
