import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Configuración de conexión adaptada para la BD de comensales
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/siac_comensales'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const uniqueDependencies = [
  'Gerencia de Producción de Mineral',
  'Gerencia de Servicios Generales y Ambiente',
  'Gerencia de Generación Eléctrica y Potencia',
  'Gerencia de Laboratorio',
  'Auditoria Interna',
  'Gerencia de Talento Humano',
  'Gerencia de Procesamiento',
  'Gerencia General de Operaciones',
  'Gerencia de Prevención y Control de Perdidas',
  'Presidencia',
  'Gerencia de Pequeña y Mediana Mineria',
  'Gerencia de Planificacion y Gestion Administrativa',
  'Gerencia de Tecnologia de la Informacion',
  'Gerencia de Proyectos Especiales',
  'Consultoria Juridica',
  'Contrata Proyectos Especiales',
  'Contrata',
  'Mibiturven',
  'Maquinarias y Logistica'
]

async function main() {
  console.log('Iniciando carga de dependencias en la base de datos...')

  for (const name of uniqueDependencies) {
    // Usamos upsert para evitar duplicados en la base de datos si corremos el script varias veces
    await prisma.dependency.upsert({
      where: { name: name },
      update: {}, // Si existe, no hace nada
      create: { 
        name: name,
        active: true 
      },
    })
    console.log(`✅ Dependencia registrada: ${name}`)
  }

  console.log('¡Carga de dependencias finalizada con éxito!')
}

main()
  .catch((e) => {
    console.error('Error durante la inserción:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
