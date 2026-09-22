# Especificación Técnica: Módulo de Despacho Asistido Masivo

## 1. Visión General
Para agilizar la entrega de raciones, el sistema incluirá un panel de búsqueda y filtrado en la interfaz de Despacho Asistido. Esto permitirá a los operadores visualizar listas dinámicas de comensales y despachar por lotes mediante selección múltiple, eliminando la necesidad del proceso "uno a uno" por cédula.

---

## 2. Parámetros de Filtro Obligatorios
La nueva interfaz incluirá una barra de herramientas con los siguientes filtros en cascada:
- **Comedor:** Selección de la instalación operativa.
- **Dependencia:** Área principal, con despliegue dinámico de sus respectivas Subdependencias.
- **Fecha:** Día correspondiente a la planificación (Por defecto, hoy).
- **Tipo de Servicio:** Desayuno, Almuerzo, Cena o Sobrecena.

---

## 3. Comportamiento Esperado

### 3.1. Grilla de Resultados (UI)
Al ejecutar la búsqueda, el sistema mostrará una tabla de datos (`<q-table>`) que listará **exclusivamente las raciones que se encuentren en estado "Pendiente por despachar"**.
- Se excluyen aquellas solicitudes que ya hayan sido retiradas o que estén rechazadas.

### 3.2. Acciones de Despacho (Checkboxes)
- La interfaz habilitará casillas de selección múltiple (checkboxes) en cada fila para realizar despachos individuales (uno a uno desde la lista).
- Se incluirá un control maestro de "Seleccionar todo" en la cabecera de la tabla.
- Existirá un botón de acción principal ("Despachar Seleccionados") para procesar el despacho por lotes (masivo) de todos los registros marcados.

---

## 4. Impacto Arquitectónico y Endpoints Requeridos

Para que esta pantalla funcione bajo los pilares de la arquitectura del ERP (Nuxt 3 + Prisma), se crearán los siguientes elementos:

### 4.1. Endpoint de Búsqueda (GET `/api/dispatch/pending-list`)
- **Responsabilidad:** Consultar la tabla `DinerRequestDetail`.
- **Filtros de BD:** `date`, `shiftType`, `subdependencyId` o `dependencyId`, `status: APPROVED`, y muy importante: `dispatchedAt: null`.

### 4.2. Endpoint de Despacho Masivo (POST `/api/dispatch/bulk-dispatch`)
- **Responsabilidad:** Recibir un arreglo masivo de `id`s de `DinerRequestDetail` y procesarlos en una transacción segura de Prisma.
- **Seguridad y Auditoría:** A cada registro procesado se le inyectará la estampa de tiempo actual `dispatchedAt = new Date()`, el `diningRoomId`, y el `dispatchedById` para identificar qué usuario del sistema realizó el despacho masivo.

### 4.3. Modificación Frontend (`index.vue`)
El archivo actual de Despacho Asistido será migrado a un sistema de pestañas (Tabs):
- **Tab 1:** Despacho Individual (Modo Cédula actual).
- **Tab 2:** Despacho Masivo (La nueva grilla con filtros).
