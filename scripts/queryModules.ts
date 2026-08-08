import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function main() {
  const modules = await prisma.module.findMany()
  console.log(JSON.stringify(modules, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
