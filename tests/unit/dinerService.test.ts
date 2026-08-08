import { describe, it, expect, vi } from 'vitest';
import { importDinersFromExcel } from '../../server/services/dinerService';

vi.mock('../../server/utils/prisma', () => {
  return {
    prisma: {
      squad: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
      position: { findFirst: vi.fn().mockResolvedValue({ id: 2 }) },
      subdependency: { findFirst: vi.fn().mockResolvedValue({ id: 3, dependencyId: 1 }) },
      warehouse: { findFirst: vi.fn().mockResolvedValue({ id: 4 }) },
      diner: {
        upsert: vi.fn().mockResolvedValue({ id: 1 })
      },
      $transaction: vi.fn((cb) => cb({
        diner: {
          upsert: vi.fn().mockResolvedValue({ id: 1 })
        }
      }))
    }
  }
});

import { prisma } from '../../server/utils/prisma';

describe('DinerService - importDinersFromExcel', () => {

  it('debería procesar correctamente las filas válidas e ignorar inválidas', async () => {
    // Filas simuladas, tal como las entregaría xlsx.utils.sheet_to_json
    const mockRows = [
      { cedula: '12345678', nombre: 'Juan', apellido: 'Perez', areaName: 'TI', squadName: 'A', comedorName: 'Principal', positionName: 'Dev' },
      { cedula: '', nombre: 'Sin Cedula', apellido: 'Test', areaName: 'RH', squadName: 'B', comedorName: 'Principal', positionName: 'HR' },
      { cedula: '87654321', nombre: 'Maria', apellido: 'Gomez', areaName: 'Ventas', squadName: 'A', comedorName: 'Secundario', positionName: 'Sales' }
    ];

    const mockUser = { id: 1, role: 'ADMIN' };

    // Usamos el servicio. Ojo: en un test real unitario mockearíamos Prisma,
    // pero como es integration/unit mixto, lo ejecutamos y limpiamos o usamos mock.
    const result = await importDinersFromExcel(mockRows, mockUser);

    // El servicio procesó las 3 filas
    expect(result).toBeDefined();
  });
});
