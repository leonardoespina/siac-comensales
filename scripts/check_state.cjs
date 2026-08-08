const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tx = await prisma.transaction.findUnique({ 
    where: { id: 13 }, 
    include: { details: true, source: true } 
  });
  console.log('Transaction 13:', JSON.stringify(tx, null, 2));
  
  const tx12 = await prisma.transaction.findUnique({ 
    where: { id: 12 }, 
    include: { details: true, source: true, destination: true } 
  });
  console.log('Transaction 12 (Transfer):', JSON.stringify(tx12, null, 2));

  const stock = await prisma.stock.findMany();
  console.log('All Stock:', JSON.stringify(stock, null, 2));
}

main().finally(() => prisma.$disconnect());
