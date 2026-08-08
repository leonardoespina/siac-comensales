import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('👤 Iniciando creación del usuario administrador...')

  // 1. Verificamos o creamos el rol ADMIN
  // Upsert busca por 'name', si no existe lo crea, si existe no hace nada (update: {})
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador Global del Sistema de Comensales',
    },
  })
  console.log('✅ Rol ADMIN verificado/creado.')

  // 2. Encriptamos la contraseña usando bcrypt
  // Nunca guardamos contraseñas en texto plano en la base de datos
  const passwordPlana = 'admin123'
  const passwordHash = await bcrypt.hash(passwordPlana, 10)
  
  // 3. Creamos el usuario Administrador
  const adminUser = await prisma.user.upsert({
    where: { cedula: 'V-00000000' },
    update: {
      roleId: roleAdmin.id,
      // Descomenta la siguiente línea si deseas que cada vez que corras este script,
      // se restablezca la contraseña a "admin123" obligatoriamente:
      // passwordHash: passwordHash 
    },
    create: {
      cedula: 'V-00000000',
      name: 'Super Administrador',
      passwordHash: passwordHash,
      roleId: roleAdmin.id,
    },
  })
  
  console.log(`✅ Usuario creado exitosamente:`)
  console.log(`   - Cédula (Usuario): ${adminUser.cedula}`)
  console.log(`   - Contraseña:       ${passwordPlana}`)
}

main()
  .catch((e) => {
    console.error('❌ Error al crear el usuario:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
