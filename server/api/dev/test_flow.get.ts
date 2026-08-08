import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const central = await prisma.warehouse.findFirst({ where: { type: 'CENTRAL' } })
  const msb = await prisma.warehouse.findFirst({ where: { type: 'LOCAL', name: 'MSB' } })
  const user = await prisma.user.findFirst()
  const product = await prisma.product.findFirst({ where: { name: { contains: 'Arroz' } } })

  if (!central || !msb || !user || !product) {
    return { error: 'Faltan datos base' }
  }

  const stockCentralIni = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } } })
  const stockMsbIni = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } } })
  
  let qtyCentralIni = stockCentralIni ? Number(stockCentralIni.quantity) : 0
  let qtyMsbIni = stockMsbIni ? Number(stockMsbIni.quantity) : 0

  const logs = []
  logs.push(`📊 STOCK INICIAL - Central: ${qtyCentralIni}, MSB: ${qtyMsbIni}`)

  // 1. Recepción
  logs.push("▶️ PASO 1: RECEPCIÓN de 50 unds al Central")
  await prisma.transaction.create({
    data: {
      type: 'RECEPTION',
      status: 'CONFIRMED',
      destinationId: central.id,
      createdById: user.id,
      approvedById: user.id,
      details: { create: [{ productId: product.id, quantity: 50, unitPrice: product.referencePrice }] }
    }
  })
  await prisma.stock.upsert({
    where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } },
    update: { quantity: { increment: 50 } },
    create: { warehouseId: central.id, productId: product.id, quantity: 50 }
  })

  // 2. Transferencia
  logs.push("▶️ PASO 2: TRANSFERENCIA de 20 unds de Central a MSB")
  await prisma.transaction.create({
    data: {
      type: 'TRANSFER',
      status: 'CONFIRMED',
      sourceId: central.id,
      destinationId: msb.id,
      createdById: user.id,
      approvedById: user.id,
      details: { create: [{ productId: product.id, quantity: 20 }] }
    }
  })
  await prisma.stock.update({
    where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } },
    data: { quantity: { decrement: 20 } }
  })
  await prisma.stock.upsert({
    where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } },
    update: { quantity: { increment: 20 } },
    create: { warehouseId: msb.id, productId: product.id, quantity: 20 }
  })

  // 3. Consumo
  logs.push("▶️ PASO 3: CONSUMO de 5 unds en MSB")
  await prisma.transaction.create({
    data: {
      type: 'CONSUMPTION',
      status: 'CONFIRMED',
      sourceId: msb.id,
      createdById: user.id,
      approvedById: user.id,
      details: { create: [{ productId: product.id, quantity: 5 }] }
    }
  })
  await prisma.stock.update({
    where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } },
    data: { quantity: { decrement: 5 } }
  })

  // Final
  const stockCentralFin = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } } })
  const stockMsbFin = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } } })
  
  let qtyCentralFin = stockCentralFin ? Number(stockCentralFin.quantity) : 0
  let qtyMsbFin = stockMsbFin ? Number(stockMsbFin.quantity) : 0

  logs.push(`📊 STOCK FINAL OBTENIDO - Central: ${qtyCentralFin}, MSB: ${qtyMsbFin}`)
  
  let centralExpected = qtyCentralIni + 50 - 20
  let msbExpected = qtyMsbIni + 20 - 5
  
  logs.push(`   Central Esperado: ${centralExpected} | Real: ${qtyCentralFin} -> ${centralExpected === qtyCentralFin ? '✅ PASS' : '❌ FAIL'}`)
  logs.push(`   MSB Esperado: ${msbExpected} | Real: ${qtyMsbFin} -> ${msbExpected === qtyMsbFin ? '✅ PASS' : '❌ FAIL'}`)

  if (centralExpected === qtyCentralFin && msbExpected === qtyMsbFin) {
    logs.push("🎉 RESULTADO: TODAS LAS PRUEBAS PASARON EXITOSAMENTE.")
  }

  return { success: true, product: product.name, logs }
})
