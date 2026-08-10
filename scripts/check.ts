import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
async function run() { 
  const users = await prisma.user.findMany({ 
    where: { warehouseId: { not: null } }, 
    include: { role: { include: { permissions: { include: { module: true } } } } } 
  }); 
  console.log(JSON.stringify(users.map(u => ({ 
    name: u.name, 
    wh: u.warehouseId, 
    perms: u.role.permissions.map(p => p.module.code) 
  })), null, 2)); 
} 
run();
