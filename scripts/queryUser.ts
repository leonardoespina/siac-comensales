import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

async function main() {
  const user = await prisma.user.findUnique({
    where: { cedula: '19073921' },
    include: {
      role: true,
      dependency: true,
      subdependency: {
        include: {
          dependency: true
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
