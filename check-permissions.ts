import 'dotenv/config'
import { prisma } from './server/utils/prisma'

async function check() {
  const user = await prisma.user.findFirst({
    where: { cedula: '18073921' },
    include: {
      role: {
        include: {
          permissions: {
            include: { module: true }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(user?.role?.permissions, null, 2));
}
check().finally(() => prisma.$disconnect());
