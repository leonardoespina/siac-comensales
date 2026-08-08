# 🏗️ Reglas de Arquitectura Hexagonal Ligera

**Stack:** Nuxt 3 (Nitro) + TypeScript (Estricto).

## Las 4 Capas Obligatorias

Toda la lógica del backend debe separarse estrictamente en estas 4 capas. Si un archivo mezcla responsabilidades de múltiples capas, es considerado Deuda Técnica Crítica.

### 1. CAPA 1: Domain (`server/domain/`)
- **Responsabilidad:** Tipos, interfaces, validaciones puras, reglas de negocio matemáticas, jerarquía de errores (DomainError, ValidationError).
- **Regla Oro:** CERO imports de librerías externas. No puede importar `prisma`, ni HTTP (`h3`), ni emitir eventos. Solo funciones puras (`input -> output`).

### 2. CAPA 2: Repository (`server/repository/`)
- **Responsabilidad:** Encapsular TODO el acceso a la base de datos. Es el **ÚNICO** lugar donde se importa y se usa `prisma`.
- **Regla Oro:** Solo hace Queries (SELECT, INSERT, UPDATE, DELETE).
- **Prohibiciones:** CERO if/else de toma de decisiones de negocio. CERO validaciones (los datos llegan validados). CERO emisión de eventos.

### 3. CAPA 3: Service (`server/services/`)
- **Responsabilidad:** Orquestar casos de uso. Decide "QUÉ" hacer combinando el dominio y los repositorios.
- **Regla Oro:** Toma las decisiones (if/else), coordina transacciones, y emite eventos (`emitEvent`).
- **Prohibiciones:** PROHIBIDO importar Prisma directamente. PROHIBIDO conocer el entorno HTTP (no recibe `event` de H3, no usa `readBody`). Tamaño MÁXIMO recomendado: 100 líneas.

### 4. CAPA 4: Handler (`server/api/`)
- **Responsabilidad:** Adaptador de entrada HTTP. Su único trabajo es traducir el mundo Web (JSON/Params) al mundo del Sistema (Services).
- **Regla Oro:** Parsear `readBody()` / `getQuery()`, llamar a UN solo Service (o Repository si es CRUD simple), y devolver la respuesta formateada.
- **Prohibiciones:** PROHIBIDO if/else de lógica de negocio. PROHIBIDO emitir eventos. Tamaño MÁXIMO recomendado: 15 líneas.
- **Wrapper:** Siempre deben envolverse en `defineApiHandler()` para que los `DomainError` sean procesados y devuelvan códigos HTTP correctos.

## Regla de Dependencia de Capas (3 Imports)
El flujo debe ser estrictamente en una dirección:
✅ **Handler → Service → Repository**

- Un Handler NUNCA debe importar a un Repository directamente a menos que sea un CRUD trivial sin reglas de negocio.
- Un Repository NUNCA debe importar a un Service.
- La "Regla de los 3 imports": Si un archivo importa de 3 o más capas distintas, viola la separación de responsabilidades. Máximo 2 capas adyacentes.
