import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../server/utils/prisma';

describe('Database (Referential Integrity)', () => {
  
  let testCategoryId: number;
  let testProductId: number;

  beforeAll(async () => {
    // Create dummy category and product to test relation
    const category = await prisma.category.create({
      data: {
        name: 'Test QA Category',
        description: 'Temp category for testing'
      }
    });
    testCategoryId = category.id;

    // We assume Unit and other models exist or we can just use minimum fields
    // Wait, let's create a minimal product. It might require a unit.
    const unit = await prisma.unit.findFirst();
    if (!unit) {
      throw new Error("No units found for testing");
    }

    const product = await prisma.product.create({
      data: {
        name: 'Test QA Product',
        sku: 'TEST-QA-001',
        categoryId: category.id,
        unitId: unit.id,
        isActive: true,
      }
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Cleanup manually if not deleted
    try {
      await prisma.product.deleteMany({ where: { categoryId: testCategoryId } });
      await prisma.category.deleteMany({ where: { id: testCategoryId } });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it('debería bloquear el borrado de una Categoría que tiene Productos asociados (onDelete: Restrict)', async () => {
    await expect(
      prisma.category.delete({
        where: { id: testCategoryId }
      })
    ).rejects.toThrowError(/Foreign key constraint failed/);
  });
});
