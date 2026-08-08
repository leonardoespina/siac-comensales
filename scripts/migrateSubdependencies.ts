import 'dotenv/config';
import fs from 'node:fs';
import { prisma } from '../server/utils/prisma.ts'; // Adaptar la ruta si es necesario

async function main() {
  const filePath = 'C:\\Users\\divisionprogramacion\\Documents\\siac\\subdependencias.sql';
  
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] No se encontró el archivo: ${filePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  // Extraer el bloque COPY public.subdependencias ... FROM stdin;
  const copyMatch = sqlContent.match(/COPY public\.subdependencias \((.*?)\) FROM stdin;\n([\s\S]*?)\\\./);
  
  if (!copyMatch) {
    console.error('[ERROR] No se encontró la sección COPY para subdependencias en el archivo SQL.');
    process.exit(1);
  }

  const dataBlock = copyMatch[2];
  const lines = dataBlock.split('\n').filter(line => line.trim().length > 0);

  console.log(`Encontradas ${lines.length} subdependencias en el SQL para inyectar al SIAC...`);

  for (const line of lines) {
    // Las columnas en el COPY son: id_subdependencia, nombre, estatus, fecha_registro, fecha_modificacion, id_dependencia, ubicacion, responsable, cedula_rif, cobra_venta
    const columns = line.split('\t');
    
    if (columns.length < 6) {
      console.warn(`[WARN] Línea ignorada (columnas insuficientes): ${line}`);
      continue;
    }

    const id = parseInt(columns[0], 10);
    const name = columns[1].trim();
    const estatus = columns[2].trim();
    const dependencyId = parseInt(columns[5], 10);
    
    const active = estatus === 'ACTIVO';

    try {
      // Usamos upsert para evitar duplicados si corremos el script múltiples veces.
      // Insertamos respetando el id original y el dependencyId original.
      await prisma.subdependency.upsert({
        where: { id: id },
        update: {
          name: name,
          active: active,
          dependencyId: dependencyId
        },
        create: {
          id: id,
          name: name,
          active: active,
          dependencyId: dependencyId
        }
      });
      console.log(`[OK] Adaptada e inyectada: [ID ${id}] ${name} (Dep: ${dependencyId})`);
    } catch (err: any) {
      console.error(`[ERROR] Falló al inyectar [ID ${id}] ${name}: ${err.message}`);
    }
  }

  // Sincronizar la secuencia (PostgreSQL) para evitar errores futuros de primary key
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.subdependencies', 'id'), (SELECT MAX(id) FROM public.subdependencies) + 1);`);
    console.log('[OK] Secuencia autoincremental de subdependencies sincronizada.');
  } catch (err: any) {
    console.warn(`[WARN] No se pudo sincronizar la secuencia autoincremental: ${err.message}`);
  }

  console.log('¡Adaptación y Migración de Subdependencias Finalizada Exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
