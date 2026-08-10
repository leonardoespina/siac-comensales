# Requerimientos del Módulo de Comensales (SIGAC)

## 1. Estructura Organizacional
La organización se compone de **Dependencias**, las cuales se dividen en **Subdependencias**. Cada Subdependencia es la unidad base para la gestión de usuarios y comensales.

## 2. Roles Administrativos por Subdependencia
Cada Subdependencia debe contar con usuarios asignados a roles administrativos, los cuales se clasifican en:
*   **Solicitante:** Usuario con capacidad para crear y gestionar solicitudes de comensales.
*   **Aprobador:** Usuario con capacidad para revisar y autorizar las solicitudes creadas por los Solicitantes.

## 3. Cuadrillas (Grupos de Trabajadores)
Cada usuario administrador (Solicitante o Aprobador) tiene a su cargo un conjunto de trabajadores. Estos trabajadores se organizan en **Cuadrillas** (grupos de trabajo) para facilitar la gestión masiva de solicitudes y retiros.

## 4. Tipos de Comensal
Los usuarios administradores pueden seleccionar el tipo de ración al momento de solicitar, debiendo elegir entre:
*   **Despacho Normal** (Plato estándar).
*   **Dieta** (Ración especial, sujeta a restricciones o preparación diferenciada).

## 5. Migración de Usuarios
Los usuarios administradores tienen la facultad de migrar (reasignar) trabajadores entre diferentes Cuadrillas, así como trasladarlos a otros Comedores, según las necesidades operativas.

## 6. Plazo de Solicitud
Todas las solicitudes de comensales deben realizarse con un **mínimo de 1 día hábil de anticipación** a la fecha de consumo. El sistema debe validar y restringir solicitudes fuera de este plazo.

## 7. Autorización para Retiro Masivo (por Cuadrilla)
Los usuarios administradores pueden designar a uno o varios trabajadores de su Cuadrilla como autorizados para el retiro masivo. Estos podrán retirar la comida en nombre de todos los miembros de la cuadrilla, agilizando el proceso mediante validación por **QR o HUELLA**.

## 8. Carga Extra por Visitas
Los usuarios administradores tienen la capacidad de realizar cargas extraordinarias de comensales para cubrir la demanda generada por visitas externas o personal eventual no registrado en el sistema. Esto se validará mediante **Código QR**.

## 9. Selección de Turno
Al momento de crear una solicitud, el usuario administrador debe seleccionar el turno de consumo correspondiente, entre las siguientes opciones:
*   Desayuno
*   Almuerzo
*   Cena
*   Sobrecena

Además, se debe seleccionar la modalidad de despacho: **"Consumo en comedor"** o **"Para llevar"**.

---

## MÓDULO DE ADMINISTRACIÓN (USUARIOS TI)
Los usuarios con rol de Administrador TI tendrán las siguientes capacidades de gestión y configuración del sistema:

### 1. Gestión de Estructura Organizacional
| Función | Descripción |
| :--- | :--- |
| **Crear Dependencias** | Registrar nuevas Dependencias en el sistema. |
| **Modificar Dependencias** | Editar información de Dependencias existentes. |
| **Eliminar Dependencias** | Desactivar o eliminar Dependencias (sujeto a validaciones de integridad). |
| **Crear Subdependencias** | Registrar nuevas Subdependencias asociadas a una Dependencia. |
| **Modificar Subdependencias**| Editar información de Subdependencias existentes. |
| **Eliminar Subdependencias** | Desactivar o eliminar Subdependencias (sujeto a validaciones de integridad). |

### 2. Asignación de Roles Administrativos
| Función | Descripción |
| :--- | :--- |
| **Asignar Administradores** | Asignar usuarios con roles de Solicitante y/o Aprobador a cada Subdependencia. |

### 3. Gestión de Comensales (Usuarios Finales)
| Función | Descripción |
| :--- | :--- |
| **Registro Individual** | Registrar comensales en el sistema, incluyendo: Datos básicos (nombres, apellidos, identificación, área) y Captura de huella digital (registro biométrico). |
| **Importación Masiva** | Cargar múltiples comensales de forma masiva mediante archivos en formato Excel (.xlsx) o CSV. El sistema debe validar la estructura del archivo y reportar errores de carga. |

### 4. Configuración de Autenticación en Puntos de Despacho
| Función | Descripción |
| :--- | :--- |
| **Activar/Desactivar Métodos** | Habilitar o deshabilitar los siguientes métodos de autenticación en los puntos de despacho (comedores): Huella digital, Código QR (individual o grupal), Reconocimiento facial (si aplica). |

### 5. Reportes y Monitoreo
| Función | Descripción |
| :--- | :--- |
| **Reportes Globales** | Acceso sin restricciones a todos los reportes del sistema, incluyendo: Solicitudes por dependencia/subdependencia, Despachos realizados, Consumo por tipo de ración (Normal/Dieta), Histórico de autenticaciones, Reportes de merma/no retiro. |

---

## MÓDULO DE AUTENTICACIÓN Y DESPACHO (COMENSALES)
Los comensales (usuarios finales) interactuarán con el sistema en los puntos de despacho a través de los siguientes flujos:

### 1. Métodos de Autenticación
| Método | Descripción |
| :--- | :--- |
| **Huella Digital** | El comensal se autentica colocando su dedo en el lector biométrico. El sistema valida su identidad contra la base de datos. |
| **Código QR Individual** | El comensal presenta su código QR único (desde su dispositivo o tarjeta) para ser escaneado en el punto de despacho. |
| **Código QR Grupal** | Un usuario autorizado presenta el código QR de su cuadrilla para retirar la comida de todos los miembros del grupo de forma masiva. |

### 2. Flujo de Respuesta del Sistema
| Escenario | Acción del Sistema |
| :--- | :--- |
| **Autenticación Exitosa + Solicitud Activa** | 1. El sistema muestra un mensaje de bienvenida con los datos del comensal. <br>2. Se confirma el despacho de la ración (Normal o Dieta). <br>3. Se registra el consumo en el historial. |
| **Autenticación Exitosa + SIN Solicitud Activa** | 1. El sistema muestra un mensaje indicando que el comensal no tiene solicitud activa (mensaje de "olvido"). <br>2. Se muestra un botón "PROCEDER" de gran tamaño y visible, que permite asistir manualmente al comensal en casos excepcionales. |

### 3. Asistencia Manual por Personal de Comedor
| Función | Descripción |
| :--- | :--- |
| **Proceder Manualmente** | Cuando un comensal no tiene solicitud activa, el personal del comedor puede hacer clic en el botón "PROCEDER" para: <br>- Registrar el despacho de forma manual. <br>- Asociar el consumo a una solicitud pendiente o extraordinaria. <br>- Quedar registrado en el historial como "Despacho Asistido" para fines de trazabilidad y control. |
