import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const txs = await prisma.transactionDetail.findMany({
    where: { productId: 61 },
    include: {
      transaction: {
        include: {
          source: true,
          destination: true
        }
      }
    },
    orderBy: { transaction: { createdAt: 'asc' } }
  })

  return { history: txs }
})
