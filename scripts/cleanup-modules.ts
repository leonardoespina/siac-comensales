import { prisma } from './server/utils/prisma'

async function cleanupModules() {
  const allowedModules = [
    'SECURITY', 'REPORT_DASHBOARD', 'POSITIONS', 'DINERS', 
    'BIOMETRIC', 'DEPENDENCIES', 'SQUADS', 'MY_SQUADS', 
    'DINERS_REQUESTS', 'DINING_ROOMS', 'SITES', 'AUDIT', 'GLOBAL_ACCESS'
  ];

  console.log('Borrando módulos antiguos del inventario...');
  
  // Primero eliminamos los permisos asociados a esos módulos
  await prisma.rolePermission.deleteMany({
    where: {
      module: {
        code: {
          notIn: allowedModules
        }
      }
    }
  });

  // Luego eliminamos los módulos
  const deleted = await prisma.module.deleteMany({
    where: {
      code: {
        notIn: allowedModules
      }
    }
  });

  console.log(`Se eliminaron ${deleted.count} módulos antiguos.`);
}

cleanupModules()
  .then(() => process.exit(0))
  .catch(console.error);
