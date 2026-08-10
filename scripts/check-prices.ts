import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const zeroPrices = await prisma.transactionDetail.count({
    where: {
      unitPrice: 0,
      transaction: {
        type: 'CONSUMPTION'
      }
    }
  })
  
  const total = await prisma.transactionDetail.count({
    where: {
      transaction: {
        type: 'CONSUMPTION'
      }
    }
  })
  
  console.log(`Detalles con precio 0: ${zeroPrices} de ${total}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
