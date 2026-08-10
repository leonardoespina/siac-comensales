import 'dotenv/config'
import { prisma } from './server/utils/prisma'

async function run() {
  try {
    await prisma.module.delete({ where: { code: 'REPORTS' } })
    console.log('Old REPORTS module deleted')
  } catch (e) {
    console.log(e)
  }
}

run().finally(() => prisma.$disconnect())
