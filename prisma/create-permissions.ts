import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🛡️ Iniciando configuración de Módulos y Permisos...')

  // 1. Crear los módulos específicos para el sistema de Comensales
  const modulesData = [
    { code: 'SECURITY', name: 'Seguridad y Accesos' },
    { code: 'REPORT_DASHBOARD', name: 'Reporte: Dashboard Principal' },
    { code: 'POSITIONS', name: 'Catálogo de Cargos' },
    { code: 'DINERS', name: 'Directorio de Comensales' },
    { code: 'BIOMETRIC', name: 'Gestión Biométrica' },
    { code: 'DEPENDENCIES', name: 'Estructura Organizacional' },
    { code: 'SQUADS', name: 'Catálogo de Cuadrillas' },
    { code: 'MY_SQUADS', name: 'Mis Cuadrillas (Local)' },
    { code: 'DINERS_REQUESTS', name: 'Solicitud de Comidas' },
    { code: 'DINING_ROOMS', name: 'Gestión de Comedores' },
    { code: 'MEAL_SCHEDULES', name: 'Horarios de Comedor' },
    { code: 'SITES', name: 'Gestión de Sedes' },
    { code: 'AUDIT', name: 'Auditoría del Sistema' },
    { code: 'GLOBAL_ACCESS', name: 'Acceso Global sin Restricciones' }
  ]

  const modules = []
  for (const mod of modulesData) {
    const created = await prisma.module.upsert({
      where: { code: mod.code },
      update: { name: mod.name },
      create: mod
    })
    modules.push(created)
  }
  console.log('✅ Módulos creados:', modules.map(m => m.code).join(', '))

  // 2. Buscar el rol ADMINISTRADOR que acabamos de crear
  const roleAdmin = await prisma.role.findUnique({
    where: { name: 'ADMIN' }
  })

  if (!roleAdmin) {
    throw new Error('No se encontró el rol ADMIN. Por favor corre create-admin.ts primero.')
  }

  // 3. Darle permisos al ADMINISTRADOR sobre TODOS los módulos
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: roleAdmin.id,
          moduleId: mod.id,
        },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        roleId: roleAdmin.id,
        moduleId: mod.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    })
  }
  console.log('✅ Permisos Totales (CRUD) asignados al Rol ADMIN.')
  console.log('🚀 Configuración de permisos terminada. ¡Ya deberías ver los módulos en el menú!')
}

main()
  .catch((e) => {
    console.error('❌ Error configurando permisos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
