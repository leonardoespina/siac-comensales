/**
 * SERVICIO: Biometría Facial y Control de Acceso Hikvision (ISAPI)
 * 
 * REFACTORIZADO A MÓDULOS DE RESPONSABILIDAD ÚNICA (AGENTS.md):
 * - server/services/hikvision/client.ts      (Digest Auth & HTTP ISAPI)
 * - server/services/hikvision/user.ts        (Fichas de usuarios en terminal)
 * - server/services/hikvision/fingerprint.ts (Plantillas de huellas)
 * - server/services/hikvision/face.ts       (Biometría facial, snapshot y FDLib)
 * - server/services/hikvision/health.ts     (Diagnóstico y conectividad)
 * - server/services/hikvision/syncHub.ts    (Orquestación multi-sede y purga)
 * - server/services/hikvision/stream.ts     (Stream alertStream en tiempo real)
 * 
 * Este archivo actúa como puente de retrocompatibilidad (cero breaking changes).
 */

export * from './hikvision'
