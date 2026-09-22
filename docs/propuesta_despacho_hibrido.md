# Propuesta de Refactorización: Despacho Asistido (Híbrido)

## 1. El Problema Actual
El operador del comedor percibe el flujo de *Despacho Asistido* como "engorroso" porque el diseño actual obliga a un flujo de trabajo **1 a 1 basado en clics**:
1. Escribir Cédula.
2. Hacer clic en "Buscar".
3. Visualizar el Radar de Turnos.
4. Hacer clic en "Despachar" en el turno correspondiente.

Para volúmenes altos de comensales en sitio, este proceso es insostenible. Además, no contempla la realidad operativa de entregar múltiples raciones a un delegado departamental (Viandas).

---

## 2. La Solución Arquitectónica (Tabs)
Se transformará la interfaz actual de `diners/assisted` utilizando un layout de Pestañas (`<q-tabs>`) que encapsulará 3 herramientas especializadas en un solo panel, dándole al operador total flexibilidad.

### Pestaña 1: ⚡ Modo Ráfaga (Fast Track)
**Propósito:** Procesar una fila larga de comensales físicos lo más rápido posible.
- **UI:** Un input gigante de "Cédula" que siempre tiene el foco activo (autofocus). 
- **Flujo:** El operador selecciona el turno a procesar (Ej: Almuerzo). Luego tipea o escanea la cédula y presiona `ENTER`.
- **Backend:** Se dispara el despacho instantáneamente. No se necesita ratón.
- **Feedback:** Debajo del input, aparece una tarjeta verde indicando el éxito (*"¡Despachado: Ronald Villa!"*) o una roja indicando rebote. El input se vacía inmediatamente para el siguiente.

### Pestaña 2: 🏢 Despacho por Lotes (Viandas / Grupos)
**Propósito:** Entregar múltiples raciones a un delegado que viene en representación de un departamento.
- **UI:** Selectores de "Turno" y "Subdependencia" (Ej: Mantenimiento).
- **Flujo:** Al seleccionar el departamento, el sistema lista a todos los empleados de ese grupo que tienen comida aprobada y no han retirado. 
- **Acción:** Un botón maestro que dice **"Despachar Lote (15 Raciones)"**.
- **Backend:** Procesamiento masivo seguro de las 15 cédulas en una sola transacción, ahorrando 60 clics al operador.

### Pestaña 3: 🔍 Auditoría / Excepciones (Radar Actual)
**Propósito:** Investigar casos atípicos o conflictos en la línea de servicio.
- **UI:** La vista actual que ya tenemos.
- **Flujo:** Búsqueda manual por cédula para ver el "Radar de Turnos". Permite ver a qué hora se despacharon los platos anteriores, detectar intentos de doble plato, etc.

---

## 3. Impacto en el Código
- **Frontend (`app/pages/diners/assisted/index.vue`):** Refactorizar utilizando `<q-tab-panels>`. Componentizar las lógicas si el archivo se vuelve muy grande.
- **Backend (`server/api/dispatch/bulk.post.ts`):** Nuevo endpoint requerido para procesar las peticiones en lote de la Pestaña 2 sin colapsar el servidor, envolviéndolo en una transacción `$transaction` de Prisma.
