import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const tx13 = await prisma.transaction.findUnique({ 
    where: { id: 13 }, 
    include: { details: true, source: true } 
  });
  
  const tx12 = await prisma.transaction.findUnique({ 
    where: { id: 12 }, 
    include: { details: true, source: true, destination: true } 
  });

  const stock = await prisma.stock.findMany();

  return { tx13, tx12, stock }
})
