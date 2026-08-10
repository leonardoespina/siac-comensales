import { prisma } from './server/utils/prisma'
import * as dinerRepo from './server/repository/dinerRepository'

async function runTests() {
  console.log("=========================================")
  console.log("INICIANDO TESTING DE COMENSALES (SITE ID)")
  console.log("=========================================")

  try {
    // 1. Obtener datos de referencia para el test
    console.log("1. Buscando dependencias y sedes...")
    const site = await prisma.site.findFirst()
    const squad = await prisma.squad.findFirst()
    const subdep = await prisma.subdependency.findFirst()

    if (!site || !squad || !subdep) {
      console.log("❌ Faltan datos base en la BD (Site, Squad o Subdependency) para realizar el test.")
      return
    }

    console.log(`✅ Sede encontrada: ${site.name} (ID: ${site.id})`)
    console.log(`✅ Cuadrilla encontrada: ${squad.name} (ID: ${squad.id})`)
    
    // 2. Crear un comensal de prueba
    console.log("\n2. Creando comensal de prueba...")
    const testCedula = `V${Math.floor(Math.random() * 10000000)}`
    
    const newDiner = await dinerRepo.createDiner({
      cedula: testCedula,
      name: "TRABAJADOR TEST",
      rationType: "NORMAL",
      squadId: squad.id,
      subdependencyId: subdep.id,
      siteId: site.id
    })

    console.log(`✅ Comensal Creado Exitosamente: ID ${newDiner.id}`)
    console.log(`- Cédula: ${newDiner.cedula}`)
    console.log(`- Sede Base (siteId): ${newDiner.siteId}`)
    
    if (newDiner.siteId !== site.id) {
       throw new Error("El siteId guardado no coincide con el provisto.")
    }

    // 3. Obtener el comensal usando repository (debe traer la Sede, no el Comedor)
    console.log("\n3. Verificando que el getDinerByCedula incluye el Site...")
    const fetchedDiner = await dinerRepo.getDinerByCedula(testCedula)
    
    if (!fetchedDiner) {
      throw new Error("No se pudo obtener el comensal recién creado.")
    }

    if (fetchedDiner.site) {
       console.log(`✅ Obtención Exitosa. Nombre de la Sede anexada: ${fetchedDiner.site.name}`)
    } else {
       console.log(`❌ ALERTA: La relación 'site' vino nula en la consulta.`)
       throw new Error("Falta la relación site en el include.")
    }

    // 4. Actualizar el comensal
    console.log("\n4. Actualizando datos del comensal...")
    const updated = await dinerRepo.updateDiner(newDiner.id, {
       rationType: "DIETA"
    })
    console.log(`✅ Comensal actualizado correctamente (Ration: ${updated.rationType}).`)

    // Limpieza
    console.log("\n5. Limpiando datos de prueba...")
    await prisma.diner.delete({ where: { id: newDiner.id } })
    console.log("✅ Limpieza completada.")

    console.log("\n=========================================")
    console.log("🎉 TODOS LOS TESTS PASARON EXITOSAMENTE 🎉")
    console.log("=========================================")

  } catch (error: any) {
    console.error("\n❌ ERROR DURANTE EL TESTING:")
    console.error(error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()
