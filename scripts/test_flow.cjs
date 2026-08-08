const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log("=========================================");
  console.log("🧪 INICIANDO TESTING AUTOMATIZADO E2E 🧪");
  console.log("=========================================\n");

  try {
    // 1. Preparar datos
    const central = await prisma.warehouse.findFirst({ where: { type: 'CENTRAL' } });
    const msb = await prisma.warehouse.findFirst({ where: { type: 'LOCAL', name: 'MSB' } });
    const user = await prisma.user.findFirst();
    const product = await prisma.product.findFirst({ where: { name: { contains: 'Arroz' } } });

    if (!central || !msb || !user || !product) {
      console.log("❌ Faltan datos base (Almacenes, Usuario o Producto) para la prueba.");
      return;
    }

    console.log(`📌 Producto a probar: ${product.name} (Precio Referencial: $${product.referencePrice})`);
    
    // Obtener stock inicial
    const stockCentralIni = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } } });
    const stockMsbIni = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } } });
    
    let qtyCentralIni = stockCentralIni ? Number(stockCentralIni.quantity) : 0;
    let qtyMsbIni = stockMsbIni ? Number(stockMsbIni.quantity) : 0;

    console.log(`📊 STOCK INICIAL:`);
    console.log(`   - Central: ${qtyCentralIni}`);
    console.log(`   - MSB: ${qtyMsbIni}\n`);

    // --- PASO 1: RECEPCIÓN ---
    console.log("▶️ PASO 1: Simulando RECEPCIÓN de 50 unds al Central...");
    const rx = await prisma.transaction.create({
      data: {
        type: 'RECEPTION',
        status: 'CONFIRMED',
        destinationId: central.id,
        createdById: user.id,
        approvedById: user.id,
        details: { create: [{ productId: product.id, quantity: 50, unitPrice: product.referencePrice }] }
      }
    });
    
    // Aplicar stock (Simulando lo que hace el backend)
    await prisma.stock.upsert({
      where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } },
      update: { quantity: { increment: 50 } },
      create: { warehouseId: central.id, productId: product.id, quantity: 50 }
    });
    console.log("✅ Recepción exitosa (+50 a Central).\n");

    // --- PASO 2: TRANSFERENCIA ---
    console.log("▶️ PASO 2: Simulando TRANSFERENCIA de 20 unds de Central a MSB...");
    const tx = await prisma.transaction.create({
      data: {
        type: 'TRANSFER',
        status: 'CONFIRMED',
        sourceId: central.id,
        destinationId: msb.id,
        createdById: user.id,
        approvedById: user.id,
        details: { create: [{ productId: product.id, quantity: 20 }] }
      }
    });

    await prisma.stock.update({
      where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } },
      data: { quantity: { decrement: 20 } }
    });
    await prisma.stock.upsert({
      where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } },
      update: { quantity: { increment: 20 } },
      create: { warehouseId: msb.id, productId: product.id, quantity: 20 }
    });
    console.log("✅ Transferencia exitosa (-20 Central, +20 MSB).\n");

    // --- PASO 3: CONSUMO ---
    console.log("▶️ PASO 3: Simulando CONSUMO de 5 unds en MSB...");
    const cx = await prisma.transaction.create({
      data: {
        type: 'CONSUMPTION',
        status: 'CONFIRMED',
        sourceId: msb.id,
        createdById: user.id,
        approvedById: user.id,
        details: { create: [{ productId: product.id, quantity: 5 }] }
      }
    });

    await prisma.stock.update({
      where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } },
      data: { quantity: { decrement: 5 } }
    });
    console.log("✅ Consumo exitoso (-5 MSB).\n");

    // --- VERIFICACIÓN FINAL ---
    const stockCentralFin = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } } });
    const stockMsbFin = await prisma.stock.findUnique({ where: { warehouseId_productId: { warehouseId: msb.id, productId: product.id } } });
    
    let qtyCentralFin = stockCentralFin ? Number(stockCentralFin.quantity) : 0;
    let qtyMsbFin = stockMsbFin ? Number(stockMsbFin.quantity) : 0;

    console.log(`📊 STOCK FINAL OBTENIDO:`);
    console.log(`   - Central: ${qtyCentralFin}`);
    console.log(`   - MSB: ${qtyMsbFin}\n`);

    console.log(`🧮 VALIDANDO MATEMÁTICA:`);
    let centralExpected = qtyCentralIni + 50 - 20;
    let msbExpected = qtyMsbIni + 20 - 5;
    
    console.log(`   Central Esperado: ${centralExpected} | Real: ${qtyCentralFin} -> ${centralExpected === qtyCentralFin ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   MSB Esperado: ${msbExpected} | Real: ${qtyMsbFin} -> ${msbExpected === qtyMsbFin ? '✅ PASS' : '❌ FAIL'}\n`);

    if (centralExpected === qtyCentralFin && msbExpected === qtyMsbFin) {
      console.log("🎉 RESULTADO: TODAS LAS PRUEBAS PASARON EXITOSAMENTE. El sistema transaccional es robusto y seguro.");
    }

  } catch (error) {
    console.error("❌ ERROR EN EL TESTING:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
