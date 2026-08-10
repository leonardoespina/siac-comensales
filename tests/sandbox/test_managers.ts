import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const managers = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        permissions: {
          some: {
            OR: [
              { module: { code: 'APPROVAL_RECEPTIONS' }, canUpdate: true },
              { module: { code: 'GLOBAL_ACCESS' }, canRead: true }
            ]
          }
        }
      }
    }
  });
  console.log("Managers for RECEPTION:");
  console.log(managers.map(m => m.name));
  
  const managers2 = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        permissions: {
          some: {
            OR: [
              { module: { code: 'APPROVAL_TRANSFERS' }, canUpdate: true },
              { module: { code: 'GLOBAL_ACCESS' }, canRead: true }
            ]
          }
        }
      }
    }
  });
  console.log("Managers for TRANSFERS:");
  console.log(managers2.map(m => m.name));
}

main().finally(async () => {
  await prisma.$disconnect();
});
