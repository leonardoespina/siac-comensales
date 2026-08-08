# ⚙️ Reglas de Backend, Seguridad y Datos

Esta matriz gobierna cómo interactúa el sistema con PostgreSQL, el manejo de eventos y las normativas de Ciberseguridad obligatorias para el ERP.

## 1. Reglas de Base de Datos y ORM (Prisma)
- **Singleton:** Prisma NUNCA se instancia múltiples veces. Se invoca EXCLUSIVAMENTE a través de `import { prisma } from '~/server/utils/prisma'`.
- **Transacciones:** Cuando un caso de uso (Service) necesita modificar múltiples tablas, el repositorio DEBE aceptar el objeto `$transaction` como parámetro opcional para mantener la atomicidad.
- **Fugas de Memoria (Data Leak):** Las queries de Prisma que involucran a usuarios u operadores NUNCA deben exponer campos como `passwordHash`, `tokens` o datos personales innecesarios. Usar siempre `select` explícitos.
- 🗑️ **PROHIBICIÓN DE HARD DELETES (Obligatorio):** En un ERP, NADA se borra físicamente. Está terminantemente prohibido usar `prisma.entity.delete()` o `deleteMany()`. Todas las entidades deben contar con un campo `deletedAt` y las eliminaciones se deben manejar con Soft Deletes (Ej: `prisma.entity.update({ data: { deletedAt: new Date() } })`). Esto garantiza la auditoría.

## 2. Validación Estricta de Entorno (Fail-Fast)
- 🔐 El servidor NO DEBE arrancar si faltan variables de entorno críticas (ej. `DATABASE_URL`, JWT secrets, etc).
- **Regla:** Implementar validación estricta de `.env` en tiempo de arranque (runtime). Si falta una variable esencial, el sistema debe registrar un Log de ERROR y abortar el arranque inmediatamente (`process.exit(1)`). Es preferible fallar de inmediato que funcionar de manera defectuosa e impredecible.

## 3. Ciberseguridad e Integridad
Como sistema industrial, la seguridad no es negociable:
- **Rate Limiting:** Todos los endpoints críticos (especialmente de inicio de sesión `/api/auth/*`) deben estar protegidos contra ataques de Fuerza Bruta. Limita intentos y banea IPs temporalmente si es necesario.
- **Payload Limits:** Los handlers deben rechazar cargas masivas o archivos excesivos para evitar colapsos de RAM en el servidor (ataques OOM / DDoS).
- **Validación Zod:** El ORM protege de inyecciones SQL, pero toda carga (body/query) del cliente DEBE ser validada en el backend antes de insertarse en la DB, para evitar contaminación de datos.

## 4. Sistema de Eventos Desacoplados (mitt)
- Nuxt/Nitro utiliza `mitt` como bus de eventos síncrono in-memory (`server/utils/eventBus.ts`).
- **Nomenclatura:** Los eventos son hechos pasados (Ej: `movement:created`, NO `create-movement`).
- **Emisión:** SOLO los Services pueden emitir eventos. NUNCA los handlers.
- **Recepción (Listeners):** Todo listener (`server/plugins/eventListeners.ts`) corre en background. Un listener NUNCA debe arrojar excepciones que rompan el flujo de quien emitió el evento.
- **WebSockets:** Si Socket.io necesita notificar a los clientes, simplemente actúa como un listener más de este bus in-memory.
