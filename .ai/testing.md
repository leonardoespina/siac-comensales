# 🧪 Reglas de Testing y Control de Calidad

**Stack:** Vitest + Nuxt Test Utils.

## 1. Filosofía de Pruebas (Test Pyramid 80/20)
No buscamos un 100% de Code Coverage ciego que retrase el desarrollo, pero sí exigimos fiabilidad absoluta en el motor del sistema.
- El **80% de tus pruebas** deben ser Pruebas Unitarias aisladas (enfocadas exclusivamente en la capa de Domain).
- El **20% restante** deben ser Pruebas de Integración (enfocadas en probar las funciones del Repository contra la Base de Datos y los Endpoints clave).

## 2. Pruebas de Dominio (Unitario Puro)
- Dado que los archivos dentro de `server/domain/` por regla arquitectónica NO tienen importaciones externas (no Prisma, no HTTP, no Eventos), son el ecosistema perfecto para el Testing Unitario ultrarrápido.
- Se debe usar el estándar de `describe`, `it`, y `expect` de Vitest.
- **Enfoque de Casos:** Prueba exhaustivamente los casos felices, pero sobre todo, los **Edge Cases** (Casos Límite): Inputs vacíos, intentos de retirar un stock mayor al inventario existente, valores negativos, etc.

## 3. Pruebas de Bases de Datos (Integración)
- ❌ **Prohibición de Mocking SQL:** En la capa de Repositorios, evitar simular (mock) a Prisma. El mocking esconde errores de sintaxis SQL.
- ✅ **Test DB Real:** Las pruebas de integración deben correrse contra una Base de Datos de pruebas real o en memoria transaccional para garantizar que cláusulas complejas (como `include`, `where` avanzados o un `select` con agrupaciones) funcionen como el ORM espera.

## 4. Testing Frontend
- **Prioridad de la Lógica:** Probar la lógica interna de los Composables y que las variables de estado de los Pinia Stores cambien y reaccionen de forma correcta tras despachar un Action.
- **Componentes Visuales:** Evitar hacer testing exhaustivo de qué color es un botón. Solo se debe probar el UI (Componentes Vue) cuando posean lógica de renderizado compleja (Ej: "Este botón solo debe existir si el usuario logueado es Administrador Global").
