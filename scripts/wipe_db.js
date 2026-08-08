const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpieza de base de datos...");

  // Borrar en orden para respetar claves foráneas (Delete cascade helps, but just in case)
  
  console.log("Borrando TransactionDetails...");
  await prisma.transactionDetail.deleteMany({});
  
  console.log("Borrando Transactions...");
  await prisma.transaction.deleteMany({});
  
  console.log("Borrando Stocks...");
  await prisma.stock.deleteMany({});
  
  console.log("Borrando Shifts...");
  await prisma.shift.deleteMany({});

  console.log("Borrando Products...");
  await prisma.product.deleteMany({});

  console.log("Borrando Categories...");
  await prisma.category.deleteMany({});

  console.log("Borrando Units...");
  await prisma.unit.deleteMany({});
  
  console.log("Borrando Institutions...");
  await prisma.institution.deleteMany({});

  console.log("¡Limpieza completada con éxito!");
}

main()
  .catch((e) => {
    console.error("Error limpiando la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
