import 'dotenv/config'
import { prisma } from './server/utils/prisma'

async function main() {
  const modules = await prisma.module.findMany()
  console.log("Modulos Actuales:")
  console.table(modules)
}

main().finally(() => prisma.$disconnect())
