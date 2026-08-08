import { describe, it, expect, beforeAll } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils/e2e';

describe('Security (API endpoints)', async () => {
  await setup({
    server: true,
  });

  it('debería bloquear acceso a la migración masiva de comensales (bulk-migrate) sin token', async () => {
    try {
      await $fetch('/api/diners/bulk-migrate', {
        method: 'PUT',
        body: { ids: [1], newDependenciaId: 2 }
      });
      expect.unreachable('Debería haber lanzado un error 401/403');
    } catch (err: any) {
      expect(err.statusCode).toBeGreaterThanOrEqual(401);
      expect(err.statusCode).toBeLessThanOrEqual(403);
    }
  });

  it('debería bloquear acceso a reporte de consumos sin token', async () => {
    try {
      await $fetch('/api/reports/consumptions', {
        method: 'GET'
      });
      expect.unreachable('Debería haber lanzado un error 401/403');
    } catch (err: any) {
      expect(err.statusCode).toBeGreaterThanOrEqual(401);
      expect(err.statusCode).toBeLessThanOrEqual(403);
    }
  });

  it('debería rechazar peticiones de login con payload incompleto (Zod Validation)', async () => {
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { cedula: '' } // falta password, cedula vacía
      });
      expect.unreachable('Zod debió haber lanzado error 400');
    } catch (err: any) {
      expect(err.statusCode).toBe(400); // Bad Request (Zod)
    }
  });

  it('debería rechazar peticiones de login con caracteres muy largos (OOM Protection)', async () => {
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { cedula: '1234', password: 'a'.repeat(200) } // Supera el max() de Zod
      });
      expect.unreachable('Zod debió haber bloqueado payload excesivo');
    } catch (err: any) {
      expect(err.statusCode).toBe(400); // Bad Request
    }
  });
});
