import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const createdTransaction = await prisma.$transaction(async (tx) => {
      
      const categoryCache = new Map()
      const unitCache = new Map()
      const productCache = new Map()

      const detailsData = []

      // Dummy row
      const catName = "VÍVERES SECOS"
      const unitName = "KILO"
      const prodName = "ARROZ BLANCO"
      const prodCode = "P-001"

      // Category
      if (!categoryCache.has(catName)) {
        const cat = await tx.category.upsert({
          where: { name: catName },
          update: {},
          create: { name: catName }
        })
        categoryCache.set(catName, cat.id)
      }

      // Unit
      if (!unitCache.has(unitName)) {
        const unit = await tx.unit.upsert({
          where: { abbreviation: unitName },
          update: {},
          create: { name: unitName, abbreviation: unitName }
        })
        unitCache.set(unitName, unit.id)
      }

      let productId = productCache.get(prodCode)
      if (!productId) {
        let product = await tx.product.findUnique({ where: { code: prodCode } })
        if (!product) {
          const byName = await tx.product.findFirst({ where: { name: prodName } })
          if (byName) {
            product = byName
          } else {
            product = await tx.product.create({
              data: {
                code: prodCode,
                name: prodName,
                categoryId: categoryCache.get(catName),
                unitId: unitCache.get(unitName),
                isPerishable: false
              }
            })
          }
        }
        productId = product.id
        productCache.set(prodCode, productId)
      }

      detailsData.push({
        productId: productId,
        quantity: 50,
        unitPrice: 1.25,
        expirationDate: null
      })

      // Try to find valid destination and supplier
      const dest = await tx.warehouse.findFirst({ where: { type: 'CENTRAL' } })
      const supp = await tx.supplier.findFirst()

      if (!dest || !supp) {
        throw new Error('No central warehouse or supplier found')
      }

      const transaction = await tx.transaction.create({
        data: {
          type: 'RECEPTION',
          status: 'DRAFT',
          destinationId: dest.id,
          supplierId: supp.id,
          createdById: 1, // Assume user 1 exists
          notes: 'Importación masiva desde Excel',
          details: {
            create: detailsData
          }
        },
        include: {
          details: true
        }
      })

      return transaction
    })

    console.log('SUCCESS!', createdTransaction.id)
  } catch (error) {
    console.error('PRISMA ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
