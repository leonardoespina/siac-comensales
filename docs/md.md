

**El sistema permitirá:**


- Que administradores de subdependencia soliciten comidas para sus
  comensales con anticipación.
- Que los comensales se autentiquen en un punto de despacho táctil
  biométrico (huella, QR o rostro) para recibir su comida.
- Manejar automáticamente los casos donde un comensal no tiene solicitud
  (olvido del administrador) mediante un botón "PROCEDER", con la
  intervención del personal de comedor.
- Generar reportes específicos por cada rol: Administrador TI,
  Administrador de subdependencia, Encargado del comedor.
- Operar 24 horas al día, 7 días a la semana, los 365 días del año, sin
  días inhábiles ni feriados.

## 2. ESTRUCTURA ORGANIZACIONAL

El sistema debe manejar la siguiente jerarquía:

- Existen dependencias.
- Cada dependencia contiene una o más subdependencias.
- Cada subdependencia tiene asociados comensales (usuarios finales que
  reciben la comida).
- Existen comedores físicos donde se prepara y despacha la comida.
- Un comensal pertenece a una subdependencia y consume en un comedor
  asignado.
- Un Administrador de subdependencia puede gestionar una o varias
  subdependencias.


## 3. ACTORES DEL SISTEMA Y SUS REQUERIMIENTOS

### 3.1. ADMINISTRADOR TI


|---|---|
| ADM-TI-01 | Crear, modificar y eliminar dependencias. |
| ADM-TI-02 | Crear, modificar y eliminar subdependencias. |
| ADM-TI-03 | Crear comedores (solo el objeto físico, no el contenido operativo). |
| ADM-TI-04 | Asignar Encargados de comedor a cada comedor. |
| ADM-TI-05 | Asignar Administradores de subdependencia a subdependencias. |
| ADM-TI-06 | Registrar comensales: datos básicos, captura de huella digital.
| ADM-TI-07 | Importar comensales masivamente desde archivo (Excel/CSV). |
| ADM-TI-11 | Activar o desactivar métodos de autenticación en punto de despacho (huella, QR, facial). |
| ADM-TI-12 | Ver reportes globales sin restricción. |
| ADM-TI-13 | Ver auditoría completa del sistema. |
 

### 3.2. ADMINISTRADOR DE SUBDEPENDENCIA (NO TI)

Es el responsable de la operación dentro de una subdependencia. Es quien
realiza todas las solicitudes de comida. Los comensales NO solicitan.

| ID | Requerimiento |
|---|---|
| ADM-SUB-01 | Visualizar listado de comensales de su subdependencia. |
| ADM-SUB-02 | Marcar la opción "Dieta" (Sí/No) para cada comensal. |
| ADM-SUB-03 | Realizar solicitud planificada con anticipación definida. |
| ADM-SUB-04 | Realizar solicitud extraordinaria el mismo día o con menor anticipación. |
| ADM-SUB-05 | Seleccionar comensales específicos o grupos enteros al solicitar. |
| ADM-SUB-06 | Seleccionar turno (desayuno, almuerzo, cena, sobrecena) al solicitar. |
| ADM-SUB-07 | Seleccionar comedor (si hay múltiples opciones) al solicitar. |
| ADM-SUB-08 | Recibir alerta si el inventario del comedor no alcanza para atender la solicitud. |
| ADM-SUB-09 | Generar código QR individual por cada comensal solicitante. |
| ADM-SUB-10 | Generar código QR grupal para una cuadrilla o grupo de comensales. |
| ADM-SUB-11 | Consultar solicitudes realizadas por fecha, turno, comensal. |
| ADM-SUB-12 | Modificar o cancelar solicitudes dentro de la ventana de tiempo permitida. |
| ADM-SUB-13 | Designar comensales responsables para retiro masivo. |
| ADM-SUB-14 | Designar comensales autorizadores para despacho grupal. |
| ADM-SUB-15 | Ver reportes limitados a su subdependencia. |

### 3.3. ENCARGADO DEL COMEDOR (ADMINISTRADOR DEL COMEDOR)

Es el responsable de la logística, preparación, inventario local y
supervisión del despacho. No interviene en el caso de olvido (el sistema
es automático).

| ID | Requerimiento |
|---|---|
| ENC-COM-01 | Gestionar catálogo de productos (ingredientes): crear, modificar, eliminar. |
| ENC-COM-02 | Definir unidad de medida por producto (kilogramos, litros, unidades). |
| ENC-COM-03 | Gestionar catálogo de platos: crear, modificar, eliminar, asignar nombre y descripción. |
| ENC-COM-04 | Gestionar recetas estándar: vincular un plato con múltiples productos y definir cantidades por plato. |
| ENC-COM-05 | Permitir versionado de recetas (actualización histórica). |
| ENC-COM-06 | Definir stock mínimo por producto en su comedor. |
| ENC-COM-07 | Definir porcentaje de holgura para imprevistos por turno. |
| ENC-COM-08 | Definir diferencia máxima aceptable en auditoría de inventario. |
| ENC-COM-09 | Configurar horarios de turnos de su comedor (inicio y cierre de despacho). |
| ENC-COM-10 | Registrar ingreso de mercancía al comedor (desde almacén central o compras locales). |
| ENC-COM-11 | Escanear códigos QR de productos al recibir mercancía. |
| ENC-COM-12 | Registrar consumo de ingredientes por preparación de alimentos. |
| ENC-COM-13 | Registrar ajustes de inventario (con justificación obligatoria). |
| ENC-COM-14 | Registrar pérdida de productos (daño, vencimiento) con número de informe físico obligatorio. |
| ENC-COM-15 | Consultar inventario actual de su comedor. |
| ENC-COM-16 | Ver solicitudes de comensales para sus turnos (desglosadas por plato). |
| ENC-COM-17 | Recibir cálculo automático de ingredientes necesarios según las solicitudes. |
| ENC-COM-18 | Comparar ingredientes necesarios con inventario disponible. |
| ENC-COM-19 | Generar pedido automático al almacén central si falta inventario. |
| ENC-COM-20 | Ver alertas de stock bajo en su comedor. |
| ENC-COM-21 | Ver alertas de productos próximos a vencer. |
| ENC-COM-22 | Registrar devolución de mercancía al almacén central. |
| ENC-COM-23 | Supervisar punto de despacho táctil biométrico. |
| ENC-COM-24 | Ver reportes operativos de su comedor. |

### 3.4. COMENSAL (USUARIO FINAL)

Es el usuario final que consume la comida. No realiza solicitudes. No
accede a reportes.

| ID | Requerimiento |
|---|---|
| COM-01 | Autenticarse en el punto de despacho mediante huella digital. |
| COM-02 | Autenticarse mediante código QR (individual o grupal). |
| COM-03 | Autenticarse mediante reconocimiento facial. |
| COM-04 | Visualizar mensaje de bienvenida con sus datos (si tiene solicitud). |
| COM-05 | Seleccionar modalidad de despacho: "Consumo en comedor" o "Para llevar". |
| COM-06 | Si tiene solicitud activa, recibir confirmación de despacho normal. |
| COM-07 | Si no tiene solicitud activa, visualizar mensaje de olvido del administrador. |
| COM-08 | Si no tiene solicitud, ver un botón "PROCEDER" grande y visible. |
| COM-09 | Al tocar "PROCEDER", el sistema registra automáticamente el despacho como "recuperación por olvido". |
| COM-10 | Si supera el límite de recuperaciones, ver mensaje de restricción. |
| COM-11 | Recibir confirmación final de despacho. |
| COM-12 | No poder despachar dos veces en el mismo turno. |

### 3.5. ALMACÉN CENTRAL (ENCARGADO DE ALMACÉN)

| ID | Requerimiento |
|---|---|
| ALM-01 | Registrar ingreso de mercancía de proveedores. |
| ALM-02 | El sistema calcula automáticamente el costo en dólares (USD). |
| ALM-03 | Generar código QR único por cada unidad física. |
| ALM-04 | Imprimir etiquetas con código QR. |
| ALM-05 | Consultar inventario central actual. |
| ALM-06 | Despachar productos a comedores según pedidos. |
| ALM-07 | Escanear códigos QR de los productos al despachar. |
| ALM-08 | Cambiar estado de productos a "En tránsito" durante el despacho. |
| ALM-09 | Recibir devoluciones de productos desde comedores. |
| ALM-10 | Registrar pérdidas justificadas con número de informe físico. |

## 4. REQUERIMIENTOS FUNCIONALES DEL SISTEMA INTEGRAL

### 4.1. REQUERIMIENTOS DE INTEGRACIÓN INVENTARIO ↔ DESPACHO

| ID | Requerimiento |
|---|---|
| INT-01 | Cada plato debe tener una receta asociada con productos y cantidades. |
| INT-02 | Cada despacho exitoso debe restar automáticamente los productos según la receta. |
| INT-03 | El plato se determina automáticamente por: turno + dieta + regla configurada. |
| INT-04 | La resta de inventario ocurre en tiempo real al confirmar el despacho. |
| INT-05 | El sistema registra en auditoría qué despacho consumió qué cantidades. |
| INT-06 | Antes de aceptar una solicitud, el sistema valida inventario disponible. |
| INT-07 | Si el inventario no alcanza, el sistema alerta al administrador y al encargado. |
| INT-08 | El sistema permite consultar ingredientes necesarios por turno futuro. |
| INT-09 | El sistema permite registrar consumos de ingredientes por preparación masiva. |
| INT-10 | El sistema genera alertas de stock bajo. |
| INT-11 | El sistema genera alertas de productos próximos a vencer. |

### 4.2. REQUERIMIENTOS DE PUNTO DE DESPACHO TÁCTIL BIOMÉTRICO

| ID | Requerimiento |
|---|---|
| DES-01 | Contar con lector de huella digital. |
| DES-02 | Contar con lector/cámara para códigos QR. |
| DES-03 | Contar con cámara para reconocimiento facial con infrarrojo. |
| DES-04 | Monitor táctil con respuesta en menos de 1 segundo. |
| DES-05 | Botones grandes, especialmente "PROCEDER". |
| DES-06 | Mensajes claros y amigables. |
| DES-07 | Retroalimentación visual por cada toque. |
| DES-08 | Sonido de confirmación configurable (opcional). |
| DES-09 | Volver a pantalla de inicio tras inactividad configurable. |
| DES-10 | Modo oscuro/claro adaptativo. |
| DES-11 | Modo offline con sincronización posterior. |

### 4.3. REQUERIMIENTOS DE RECUPERACIÓN POR OLVIDO

| ID | Requerimiento |
|---|---|
| OLV-01 | Mostrar mensaje claro cuando no hay solicitud. |
| OLV-02 | Mostrar botón "PROCEDER". |
| OLV-03 | Sin intervención del encargado del comedor. |
| OLV-04 | Registrar despacho como "recuperación por olvido". |
| OLV-05 | Verificar límite de recuperaciones por comensal. |
| OLV-06 | Denegar despacho si se supera el límite. |
| OLV-07 | Consumir inventario igual que un despacho normal. |
| OLV-08 | Aparecer en reportes del Administrador de subdependencia. |
| OLV-09 | Aparecer en reportes del Administrador TI. |

### 4.4. REQUERIMIENTOS DE SOLICITUDES

| ID | Requerimiento |
|---|---|
| SOL-01 | Solo el Administrador de subdependencia puede solicitar. |
| SOL-02 | Solicitud planificada con anticipación definida. |
| SOL-03 | Solicitud extraordinaria el mismo día. |
| SOL-04 | Validar inventario al solicitar. |
| SOL-05 | Alertar si inventario insuficiente. |
| SOL-06 | Generar QR individuales. |
| SOL-07 | Generar QR grupales. |
| SOL-08 | QR con vigencia limitada al turno. |
| SOL-09 | Consultar, modificar o cancelar solicitudes. |

### 4.5. REQUERIMIENTOS DE GESTIÓN DE INVENTARIO LOCAL

| ID | Requerimiento |
|---|---|
| INV-01 | Registrar ingreso de mercancía escaneando QR o manual. |
| INV-02 | Mantener historial de movimientos. |
| INV-03 | Impedir consumir más de lo disponible. |
| INV-04 | Toda pérdida requiere número de informe físico. |
| INV-05 | Producto perdido no puede volver a usarse. |
| INV-06 | Ajustes requieren justificación y quedan en auditoría. |
| INV-07 | Mostrar inventario actual en tiempo real. |

### 4.6. REQUERIMIENTOS DE RECETAS Y PLATOS

| ID | Requerimiento |
|---|---|
| REC-01 | Crear, modificar y eliminar productos. |
| REC-02 | Crear, modificar y eliminar platos. |
| REC-03 | Vincular platos con productos y cantidades. |
| REC-04 | Versionado de recetas. |
| REC-05 | Validar consistencia de recetas. |

## 5. REQUERIMIENTOS DE REPORTES POR ROL

### 5.1. REPORTES PARA ADMINISTRADOR TI

| ID | Reporte |
|---|---|
| REP-TI-01 | Consumo general |
| REP-TI-02 | Solicitudes vs despachos reales |
| REP-TI-03 | Reporte de olvidos |
| REP-TI-04 | Cruce inventario vs despachos |
| REP-TI-05 | Eficiencia por comedor |
| REP-TI-06 | Eficiencia por subdependencia |
| REP-TI-07 | Reporte de pérdidas |
| REP-TI-08 | Auditoría completa |
| REP-TI-09 | Productos próximos a vencer |
| REP-TI-10 | Capacidad por turno |

### 5.2. REPORTES PARA ADMINISTRADOR DE SUBDEPENDENCIA

| ID | Reporte |
|---|---|
| REP-SUB-01 | Consumo de mi subdependencia |
| REP-SUB-02 | Solicitudes realizadas |
| REP-SUB-03 | Olvidos (recuperaciones automáticas) |
| REP-SUB-04 | Modalidad de despacho |
| REP-SUB-05 | Comensales con dieta |
| REP-SUB-06 | Comensales inactivos |
| REP-SUB-07 | Detalle por comensal |

### 5.3. REPORTES PARA ENCARGADO DEL COMEDOR

| ID | Reporte |
|---|---|
| REP-COM-01 | Consumo por turno (operativo) |
| REP-COM-02 | Cálculo de ingredientes necesarios |
| REP-COM-03 | Comparación inventario actual vs necesario |
| REP-COM-04 | Comidas por modalidad |
| REP-COM-05 | Dietas especiales por turno |
| REP-COM-06 | Olvidos del día |
| REP-COM-07 | Despachos pendientes |
| REP-COM-08 | Resumen rápido (dashboard) |
| REP-COM-09 | Stock actual |
| REP-COM-10 | Movimientos de inventario |

## 6. REGLAS DE NEGOCIO OBLIGATORIAS

| ID | Regla |
|---|---|
| RN-01 | Solo el Administrador de subdependencia puede realizar solicitudes. |
| RN-02 | Solicitud planificada con anticipación definida. |
| RN-03 | Solicitud extraordinaria el mismo día. |
| RN-04 | Dieta especial marcada por Administrador de subdependencia. |
| RN-05 | Error "no solicitado" muestra botón "PROCEDER" automático. |
| RN-06 | Recuperación por olvido marcada en reportes. |
| RN-07 | Selección de modalidad obligatoria. |
| RN-08 | Múltiples capturas de huella por comensal. |
| RN-09 | QR únicos por transacción. |
| RN-10 | Acceso a reportes según rol. |
| RN-11 | Operación continua 24/7. |
| RN-12 | Límite de recuperaciones por comensal por período. |
| RN-13 | Cada despacho resta inventario según receta. |
| RN-14 | Validación de inventario en solicitud. |
| RN-15 | Pérdida requiere número de informe físico. |
| RN-16 | Trazabilidad total de acciones. |

## 7. REQUERIMIENTOS NO FUNCIONALES

| ID | Requerimiento |
|---|---|
| RNF-01 | Respuesta táctil en menos de 1 segundo. |
| RNF-02 | Interfaces accesibles desde navegador y móvil. |
| RNF-03 | Despacho en menos de 2 segundos. |
| RNF-04 | Disponibilidad 24/7. |
| RNF-05 | Datos biométricos cifrados. |
| RNF-06 | Modo offline con sincronización. |
| RNF-07 | Escalabilidad según demanda. |
| RNF-08 | Ajustes sin reprogramación. |
| RNF-09 | Auditoría inmodificable. |
| RNF-10 | Copias de seguridad automáticas. |

## 8. RESTRICCIONES TÉCNICAS Y OPERATIVAS

| ID | Restricción |
|---|---|
| RES-01 | Pantalla endurecida para ambiente de comedor. |
| RES-02 | Cámara con infrarrojo para poca luz. |
| RES-03 | Etiquetas QR resistentes a humedad y grasa. |
| RES-04 | Manejo de turnos que cruzan medianoche. |
| RES-05 | Tasa de cambio para cálculos en USD. |

## 9. GLOSARIO DE TÉRMINOS

| Término | Definición |
|---|---|
| Comensal | Usuario final que recibe la comida. No solicita. |
| Administrador de subdependencia | Realiza solicitudes. Marca dieta. Responsable de olvidos. |
| Administrador TI | Configuración global, registra comensales, ve todo. |
| Encargado del comedor | Prepara, gestiona inventario, define recetas y umbrales. |
| Producto | Ingrediente (arroz, carne, aceite). |
| Plato | Unidad de comida servida. |
| Receta | Relación producto-cantidad por plato. |
| Solicitud | Registro de intención de consumo. |
| Despacho | Evento de entrega de comida. |
| Recuperación por olvido | Despacho sin solicitud mediante "PROCEDER". |
| Modalidad | Consumo en comedor / Para llevar. |
| Inventario local | Existencias del comedor. |
| Almacén central | Depósito principal. |
| QR individual | Por comensal por solicitud. |
| QR grupal | Por grupo (cuadrilla). |

## 10. CONCLUSIÓN

El sistema integral debe cumplir con:

- Unificación completa entre control de inventario y gestión de despacho.
- Integración clave a través de RECETAS.
- Operación continua 24/7 sin intervención manual en olvidos.
- Responsabilidades claramente asignadas por rol.
- Reportes diferenciados para autoevaluación, operación y auditoría.

## 11. APROBACIONES

| Rol | Nombre | Fecha | Firma |
|---|---|---|---|
| Analista de Requerimientos | | | |
| Administrador TI | | | |
| Administrador de subdependencia | | | |
| Encargado del comedor | | | |
| Usuario final (Comensal) | | | |

**FIN DEL DOCUMENTO**