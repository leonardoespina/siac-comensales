import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const notifs = await prisma.notification.findMany();
  console.log(JSON.stringify(notifs, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
