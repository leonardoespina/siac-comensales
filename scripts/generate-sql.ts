import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import fs from 'fs'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function generateSQL() {
  const modules = await prisma.module.findMany()
  const roles = await prisma.role.findMany()
  const users = await prisma.user.findMany()
  const perms = await prisma.rolePermission.findMany()
  const wh = await prisma.warehouse.findMany()
  const dr = await prisma.diningRoom.findMany()

  let sql = `-- ==========================================\n`
  sql += `-- SCRIPT DE INYECCION DIRECTA (SUPABASE SQL)\n`
  sql += `-- ==========================================\n\n`
  
  sql += `-- 1. RESET AUDITORIA\n`
  sql += `TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;\n\n`
  
  sql += `-- 2. LIMPIAR TABLAS DE CONFIGURACION ANTES DE INYECTAR\n`
  sql += `TRUNCATE TABLE role_permissions, modules, users, roles, dining_rooms, warehouses RESTART IDENTITY CASCADE;\n\n`

  sql += `-- 3. INYECTAR ALMACENES Y COMEDORES\n`
  wh.forEach(w => {
    sql += `INSERT INTO warehouses (id, name, type, created_at, updated_at) VALUES (${w.id}, '${w.name}', '${w.type}', NOW(), NOW());\n`
  })
  dr.forEach(d => {
    sql += `INSERT INTO dining_rooms (id, name, warehouse_id, created_at, updated_at) VALUES (${d.id}, '${d.name}', ${d.warehouseId}, NOW(), NOW());\n`
  })
  sql += `\n`

  sql += `-- 4. INYECTAR ROLES Y MODULOS\n`
  roles.forEach(r => {
    sql += `INSERT INTO roles (id, name, description) VALUES (${r.id}, '${r.name}', '${r.description || ''}');\n`
  })
  modules.forEach(m => {
    sql += `INSERT INTO modules (id, name, code) VALUES (${m.id}, '${m.name}', '${m.code}');\n`
  })
  sql += `\n`

  sql += `-- 5. INYECTAR PERMISOS AL ADMIN\n`
  perms.forEach(p => {
    sql += `INSERT INTO role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete) VALUES (${p.roleId}, ${p.moduleId}, ${p.canCreate}, ${p.canRead}, ${p.canUpdate}, ${p.canDelete});\n`
  })
  sql += `\n`

  sql += `-- 6. INYECTAR USUARIOS\n`
  users.forEach(u => {
    sql += `INSERT INTO users (id, cedula, name, password_hash, active, role_id, created_at, updated_at) VALUES (${u.id}, '${u.cedula}', '${u.name}', '${u.passwordHash}', true, ${u.roleId}, NOW(), NOW());\n`
  })
  sql += `\n`

  fs.writeFileSync('C:\\Users\\divisionprogramacion\\.gemini\\antigravity\\brain\\ca180c3f-bdfa-4ce2-bc4e-0ab493309ca6\\scratch\\supabase_seed.sql', sql)
  console.log('SQL Generated successfully.')
}

generateSQL().catch(e => {
  console.error(e)
}).finally(async () => {
  await prisma.$disconnect()
})
