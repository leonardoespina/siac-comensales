import { describe, it, expect, vi } from 'vitest';
import { importReceptionFromExcel } from '../../server/services/receptionService';

vi.mock('../../server/utils/prisma', () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      category: { upsert: vi.fn() },
      unit: { upsert: vi.fn() },
      product: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
      transaction: { create: vi.fn() }
    }
  }
});

import { prisma } from '../../server/utils/prisma';
import * as audit from '../../server/utils/audit';

describe('ReceptionService - importReceptionFromExcel', () => {

  it('debería procesar correctamente y crear una transacción en estado BORRADOR', async () => {
    const mockRows = [
      {
        productName: 'Tomates',
        categoryName: 'VERDURAS',
        unitName: 'KG',
        quantity: 50,
        unitPrice: 10
      }
    ];

    // Espiar y mockear prisma.$transaction
    const prismaTransactionSpy = vi.spyOn(prisma, '$transaction').mockResolvedValue({
      id: 999,
      status: 'DRAFT',
      details: [{ productId: 1, quantity: 50 }]
    } as any);

    const auditSpy = vi.spyOn(audit, 'logAudit').mockResolvedValue();

    const result = await importReceptionFromExcel(1, 2, 3, 'FACT-001', mockRows);

    expect(result.id).toBe(999);
    expect(result.status).toBe('DRAFT');
    expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy).toHaveBeenCalledWith(1, 'CREATE', 'TRANSACTION', 999, expect.any(String));

    prismaTransactionSpy.mockRestore();
    auditSpy.mockRestore();
  });

  it('debería lanzar un error si se omiten parámetros requeridos', async () => {
    await expect(
      importReceptionFromExcel(1, 0, 0, '', [])
    ).rejects.toThrowError(/Debe proporcionar/);
  });
});
