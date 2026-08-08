import 'dotenv/config'
import { prisma } from './server/utils/prisma'

async function main() {
  try {
    const mod = await prisma.module.upsert({
      where: { code: 'REPORT_EVOLUTION' },
      update: {},
      create: { name: 'Reporte: Evolución de Gasto', code: 'REPORT_EVOLUTION' }
    })
    console.log("Módulo creado con éxito:", mod)
  } catch(e) {
    console.error("Error", e)
  }
}

main().finally(() => prisma.$disconnect())
