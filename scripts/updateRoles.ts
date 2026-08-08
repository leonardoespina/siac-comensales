import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function main() {
  const roleNames = ['ADMIN', 'ADMINISTRADOR', 'GERENTE']
  const updated = await prisma.role.updateMany({
    where: {
      name: { in: roleNames }
    },
    data: {
      isGlobal: true
    }
  })
  console.log(`Roles actualizados a globales: ${updated.count}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
