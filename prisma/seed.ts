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
  console.log('🌱 Iniciando carga de datos (Seed)...')

  // 1. Crear los módulos del sistema
  const modulesData = [
    { code: 'PRODUCTS', name: 'Catálogo de Productos' },
    { code: 'CATEGORIES', name: 'Categorías de Productos' },
    { code: 'UNITS', name: 'Unidades de Medida' },
    { code: 'WAREHOUSES', name: 'Gestión de Almacenes' },
    { code: 'SECURITY', name: 'Seguridad y Accesos' },
    { code: 'RECEPTIONS', name: 'Recepciones y Compras' },
    { code: 'TRANSFERS', name: 'Transferencias' },
    { code: 'OPERATIONS', name: 'Operación Diaria y Consumos' },
    { code: 'REPORT_DASHBOARD', name: 'Reporte: Dashboard de Estadísticas' },
    { code: 'REPORT_MASTER', name: 'Reporte: Kardex Maestro de Solicitudes' },
    { code: 'REPORT_SUMMARY', name: 'Reporte: Resumen Consolidado por Gerencias' },
    { code: 'REPORT_VALUE', name: 'Reporte: Valor del Inventario' },
    { code: 'REPORT_ALERTS', name: 'Reporte: Alertas de Stop' },
    { code: 'REPORT_MINMAX', name: 'Reporte: Mínimos y Máximos' },
    { code: 'REPORT_CONSUMPTIONS', name: 'Reporte: Consumos y Mermas' },
    { code: 'REPORT_INSTITUTIONS', name: 'Reporte: Apoyos Institucionales' },
    { code: 'REPORT_SHIFTS', name: 'Reporte: Historial de Turnos' },
    { code: 'REPORT_RECEPTIONS', name: 'Reporte: Matriz de Recepciones' },
    { code: 'POSITIONS', name: 'Catálogo de Cargos' },
    { code: 'DINERS', name: 'Directorio de Comensales' },
    { code: 'DISPATCH', name: 'Despacho' },
    { code: 'ASSISTED_DISPATCH', name: 'Despacho Asistido' },
    { code: 'BIOMETRIC', name: 'Gestión Biométrica' },
    { code: 'DEPENDENCIES', name: 'Estructura Organizacional' },
    { code: 'SQUADS', name: 'Catálogo de Cuadrillas' },
    { code: 'MY_SQUADS', name: 'Mis Cuadrillas (Local)' },
    { code: 'DINERS_REQUESTS', name: 'Solicitud de Comidas' },
    { code: 'DINING_ROOMS', name: 'Gestión de Comedores' },
    { code: 'SITES', name: 'Gestión de Sedes' },
    { code: 'SUPPLIERS', name: 'Catálogo de Proveedores' },
    { code: 'INSTITUTIONS', name: 'Instituciones (Apoyos)' },
    { code: 'AUDIT', name: 'Auditoría del Sistema' },
    { code: 'GLOBAL_ACCESS', name: 'Acceso Global sin Restricciones' },
    { code: 'APPROVAL_TRANSFERS', name: 'Firma: Aprobar Despachos' },
    { code: 'EXTRAORDINARY', name: 'Visitas y Extraordinarios' }
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

  // 2. Crear el rol ADMINISTRADOR
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador del Sistema',
    },
  })
  console.log('✅ Rol ADMIN creado.')

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
  console.log('✅ Permisos Totales asignados al Rol ADMIN.')

  // 4. Crear el usuario de prueba
  const passwordHash = await bcrypt.hash('123456', 10)
  
  await prisma.user.upsert({
    where: { cedula: 'V-12345678' },
    update: {
      roleId: roleAdmin.id,
      // ELIMINADO: No sobreescribir la contraseña si el usuario ya existe
    },
    create: {
      cedula: 'V-12345678',
      name: 'Administrador de Prueba',
      passwordHash: passwordHash,
      roleId: roleAdmin.id,
    },
  })
  console.log('✅ Usuario Administrador creado (Cédula: V-12345678 | Pass: 123456).')

  // 5. Crear Sedes y Comedor de prueba
  const sitePLC = await prisma.site.upsert({
    where: { name: 'PLC' },
    update: {},
    create: {
      name: 'PLC',
      description: 'Sede Principal'
    }
  })

  const siteMSB = await prisma.site.upsert({
    where: { name: 'MSB' },
    update: {},
    create: {
      name: 'MSB',
      description: 'Sede MSB'
    }
  })
  console.log('✅ Sedes PLC y MSB creadas.')

  await prisma.diningRoom.upsert({
    where: { name: 'Comedor Principal' },
    update: {
      siteId: sitePLC.id
    },
    create: {
      name: 'Comedor Principal',
      siteId: sitePLC.id
    }
  })
  console.log('✅ Comedor Principal creado y vinculado a la sede PLC.')

  console.log('🚀 Seed terminado exitosamente.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
