import 'dotenv/config';
import fs from 'node:fs';
import { prisma } from '../server/utils/prisma.ts';

async function main() {
  const filePath = 'C:\\Users\\divisionprogramacion\\Documents\\siac\\t_cuadrilla.sql';
  
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] No se encontró el archivo: ${filePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  // Extraer el bloque VALUES del INSERT INTO `t_cuadrilla`
  // Busca INSERT INTO `t_cuadrilla` ... VALUES y captura todo hasta el punto y coma final
  const insertMatch = sqlContent.match(/INSERT INTO `t_cuadrilla` \([^)]+\) VALUES\s*([\s\S]*?);/);
  
  if (!insertMatch) {
    console.error('[ERROR] No se encontró la sentencia INSERT INTO `t_cuadrilla` en el archivo SQL.');
    process.exit(1);
  }

  const valuesBlock = insertMatch[1];
  
  // Expresión regular para extraer las tuplas (id, 'nombre')
  // Match: (numero, 'cadena')
  const tupleRegex = /\(\s*(\d+)\s*,\s*'([^']+)'\s*\)/g;
  let match;
  let count = 0;

  console.log(`Procesando cuadrillas desde el SQL para inyectar al SIAC...`);

  while ((match = tupleRegex.exec(valuesBlock)) !== null) {
    const id = parseInt(match[1], 10);
    let name = match[2].trim();

    // Regla de Negocio: Transformar "Área Administrativa" o variantes a "ADMINISTRATIVO"
    if (name.toLowerCase().includes('administrativ') || name.toLowerCase().includes('administración')) {
        name = 'ADMINISTRATIVO';
    }

    try {
      // Usamos upsert para evitar duplicados y mantener la idempotencia del script
      await prisma.squad.upsert({
        where: { id: id },
        update: {
          name: name,
          active: true // Asumimos que todas están activas por defecto
        },
        create: {
          id: id,
          name: name,
          active: true
        }
      });
      console.log(`[OK] Adaptada e inyectada: [ID ${id}] ${name}`);
      count++;
    } catch (err: any) {
      console.error(`[ERROR] Falló al inyectar [ID ${id}] ${name}: ${err.message}`);
    }
  }

  console.log(`Total procesadas: ${count} cuadrillas.`);

  // Sincronizar la secuencia (PostgreSQL) para evitar errores futuros de primary key
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.squads', 'id'), COALESCE((SELECT MAX(id) FROM public.squads), 0) + 1);`);
    console.log('[OK] Secuencia autoincremental de squads sincronizada.');
  } catch (err: any) {
    console.warn(`[WARN] No se pudo sincronizar la secuencia autoincremental: ${err.message}`);
  }

  console.log('¡Adaptación y Migración de Cuadrillas Finalizada Exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
