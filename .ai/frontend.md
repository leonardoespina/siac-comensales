# 🧠 Reglas de Lógica Frontend

**Stack:** Vue 3 (Composition API con `<script setup lang="ts">`) + Pinia + Nuxt 3.

## 1. La Capa de Componentes (.vue)
- **Regla Oro:** Los componentes visuales NO PIENSAN, solo RENDERIZAN y ORQUESTAN interacciones simples.
- **Límite de Estado:** Un componente no debe tener más de 3 variables reactivas propias (`ref()` o `reactive()`). Si tiene más, significa que hay lógica de negocio compleja; DEBES extraerla a un Composable (`composables/useXxx.ts`).
- **Llamadas a API:** Los componentes tienen ESTRICTAMENTE PROHIBIDO usar `$fetch` o llamadas a la API directamente. Todas las llamadas deben solicitarse a través de una acción (action) de un Store de Pinia.

## 2. La Capa de Lógica (Composables)
- Todo flujo de formularios, cálculos pesados, o manipulación compleja de estado va aquí.
- **Nomenclatura:** Los archivos siempre empiezan con `use` (ej: `useProductForm.ts`).
- **Encapsulamiento:** Todo composable debe retornar sus variables de estado envueltas en `readonly()` para evitar que el componente visual muté el estado inadvertidamente. Solo las funciones del composable pueden alterar su propio estado.
- Un composable JAMÁS tiene un template HTML.

## 3. La Capa de Datos (Pinia Stores)
- Pinia es el único puente autorizado para interactuar con el backend HTTP.
- Todos los stores deben declararse usando el Setup Pattern (Composition API `defineStore('name', () => { ... })`).
- **Optimización Local:** Después de ejecutar un `POST`, `PUT` o `DELETE` exitoso hacia el servidor, el store DEBE actualizar su arreglo local (ej: `items.value.unshift(newData)`) en lugar de hacer un *refetch* masivo de toda la tabla.
- **Responsabilidad Estricta:** Un store NO hace tareas de UI. No lanza modales, no navega con el router, y no dispara *Toasts/Notify*. El store solo lanza el error o retorna la data, el Composable es quien reacciona y avisa al componente visual.

## 4. Tiempo Real (WebSockets)
- Existe un único singleton en `composables/core/useSocket.ts` responsable de la conexión Socket.io.
- Los Stores de Pinia se suscriben a este socket de forma reactiva, lo cual permite que si el backend notifica un cambio de inventario, el Store actualice sus variables y todos los componentes visuales reaccionen instantáneamente sin recargar la página.
