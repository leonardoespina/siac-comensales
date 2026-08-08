import { prisma } from '../server/utils/prisma.ts';

async function verify() {
  const count = await prisma.dependency.count();
  console.log(`Hay ${count} dependencias en la base de datos.`);
  const deps = await prisma.dependency.findMany({ take: 5 });
  console.log('Muestra:', deps);
}

verify().catch(console.error);
