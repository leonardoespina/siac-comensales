import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

async function main() {
  const { prisma } = await import('../server/utils/prisma')

  const totalDiners = await prisma.diner.count()
  console.log('Total Diners in Database:', totalDiners)

  const grouped = await prisma.diner.groupBy({
    by: ['subdependencyId'],
    _count: {
      _all: true
    }
  })

  console.log('\nDiners by Subdependency:')
  for (const group of grouped) {
    const subdep = group.subdependencyId 
      ? await prisma.subdependency.findUnique({ where: { id: group.subdependencyId } }) 
      : null
    console.log(`- [Subdep ID ${group.subdependencyId || 'Ninguno'}] ${subdep ? subdep.name : 'Desconocido'}: ${group._count._all} trabajadores`)
  }
}

main().catch(console.error)
