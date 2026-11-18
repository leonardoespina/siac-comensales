# 🛡️ Biblia de Arquitectura e Integración Biométrica Hikvision MinMoe para `C:\crudbase` (Gestión de Compensación y Pagos)

> [!IMPORTANT]
> **INSTRUCCIÓN ESTRICTA PARA EL AGENTE DE IA EN `C:\crudbase` (LECTURA OBLIGATORIA ANTES DE CODIFICAR):**  
> Estás en el proyecto **Gestión de Compensación y Pagos (`C:\crudbase`)**, el cual convive en la misma máquina de desarrollo y en el mismo servidor de producción Debian (`10.60.0.21`) con el sistema hermano **SIAC Comensales (`C:\siac\comensales`)**.  
> En `C:\siac\comensales` **YA EXISTE** el motor biométrico Hikvision MinMoe (DS-K1T342 / DS-K1T341 / V4.38+) 100% depurado, probado y blindado contra caídas de red.  
> **PROHIBIDO inventar o escribir desde cero clientes ISAPI, Digest Auth o lectores de eventos.** Cuando debas implementar biometría en `C:\crudbase`, **TU PRIMER PASO OBLIGATORIO** es usar `read_file` para leer los archivos de `C:\siac\comensales` listados abajo, portarlos a `C:\crudbase` adaptando los nombres de modelo (`Diner` -> `Empleado`, `DiningRoom` -> `Branch`) y respetar las 9 Reglas de Oro de este documento.

---

## 🗺️ PARTE 0: Archivos Oficiales en `C:\siac\comensales` que la IA debe Leer y Portar

Antes de escribir código biométrico en `C:\crudbase`, lee exactamente estas rutas de `C:\siac\comensales`:

### 1. Dominio Puro (Copiar/Adaptar a `C:\crudbase\server\domain\`)
* 📄 **`C:\siac\comensales\server\domain\biometrics.ts`**  
  Contiene tipos (`HikvisionDeviceConfig`, `BiometricDetectionEvent`, `HikvisionDigestChallenge`), errores (`HikvisionConnectionError`, `HikvisionAuthError`) y funciones puras como `sanitizeEmployeeNo(cedula)` (limpia la cédula a solo dígitos).
* 📄 **`C:\siac\comensales\server\domain\biometricStream.ts`**  
  Contiene la lógica pura de backoff exponencial (`computeBackoffDelay`) y estados del supervisor (`CONNECTED`, `CONNECTING`, `BACKOFF`, `DOWN`).

### 2. Servicios Hikvision Blindados (Copiar/Adaptar a `C:\crudbase\server\services\hikvision\`)
* 📄 **`C:\siac\comensales\server\services\hikvision\client.ts`** *(CRÍTICO - COPIAR ÍNTEGRO)*  
  Cliente HTTP/HTTPS ISAPI con autenticación criptográfica **Digest RFC 2617**, caché de retos por IP (`challengeCache`), agente único **`sharedHttpsAgent` (`keepAlive: true, maxSockets: 10, keepAliveMsecs: 5000`)** y drenado obligatorio `res.resume()` en `fetchDeviceChallenge`.
* 📄 **`C:\siac\comensales\server\services\hikvision\acsPolling.ts`** *(CRÍTICO - COPIAR ÍNTEGRO)*  
  Sondeo inverso de alta velocidad (`timeReverseOrder: true`) sobre `/ISAPI/AccessControl/AcsEvent?format=json` para terminales MinMoe V4.38+. Incluye:
  - Cursor incremental `lastSeenSerial`.
  - Filtro anti-ráfaga de 25 segundos (`Date.now() - eventTime > 25000`) para ignorar eventos viejos al reconectar.
  - **Circuit Breaker (`consecutiveErrors >= 5`)** con enfriamiento de `2000ms` y llamada a `safeClose()` cuando una sede pierde red.
* 📄 **`C:\siac\comensales\server\services\hikvision\streamConnection.ts`** *(CRÍTICO - COPIAR ÍNTEGRO)*  
  Conector de bajo nivel con conmutación automática a `openAcsPollingConnection()` y destrucción segura de sockets (`.on('error', () => {})` antes de `.destroy()`).
* 📄 **`C:\siac\comensales\server\services\hikvision\streamSupervisor.ts`**  
  Orquestador y Watchdog multi-sede en memoria que administra reconexiones progresivas sin ahogar el Event Loop.
* 📄 **`C:\siac\comensales\server\services\hikvision\stream.ts`**  
  Contiene `handleDetectedAccessEvent()`, el anti-rebote en memoria (`recentDetections` de 4 segundos) y emite el evento **`biometric:identified`** hacia `server/utils/eventBus.ts`.
* 📄 **`C:\siac\comensales\server\services\hikvision\face.ts` y `user.ts`**  
  Inyección y extracción de fotos faciales JPEG (`FDLib/FaceDataRecord`), borrado previo y creación/actualización de usuarios (`UserInfo/SetUp`) enviando siempre el nombre completo (`nombres + apellidos`) del `Empleado`.
* 📄 **`C:\siac\comensales\server\services\hikvision\capture.ts` y `uploadFace.ts`**  
  Disparo de captura interactiva en la pantalla física del terminal (`/ISAPI/AccessControl/CaptureFaceData`) y subida de fotos con auto-replicación.
* 📄 **`C:\siac\comensales\server\services\hikvision\syncHub.ts`**  
  Sincronizador Hub-and-Spoke que replica rostro, nombre y huella de un trabajador hacia todos los terminales biométricos activos.

### 3. Plugin Nitro y Agente Edge (Para Sedes con Caídas de Internet como MSB)
* 📄 **`C:\siac\comensales\server\plugins\03.hikvision.ts`**  
  Plugin que inicializa el supervisor y conecta `eventBus.on('biometric:identified', ...)` con Socket.io (`C:\crudbase\server\utils\socket.ts`).
* 📄 **`C:\siac\comensales\tools\edge-agent\edgeServer.ts`**  
  Agente local (`localhost:3005`) si se requiere validación biométrica local cuando una sede pierde internet contra el servidor central.

---

## 🔗 PARTE 1: Estrategia de Integración entre `C:\crudbase` y `C:\siac\comensales` (Rostros y Trabajadores)

Dado que ambos sistemas corren en el **mismo servidor Debian (`10.60.0.21`)** (Comensales en puerto `3000` y Pagos en puerto `3004`) y usan **biométricos físicos nuevos dedicados para Taquilla de Pago**:

### 1. Reutilización del 100% de los Rostros ya Capturados (Almacenamiento Compartido o Sincronizado)
- En `C:\siac\comensales`, todas las fotos faciales ya están limpias y nombradas por cédula en:
  - **Desarrollo Windows:** `C:\siac\comensales\storage\biometrics\faces\{cedula}.jpg`
  - **Producción Debian (`10.60.0.21`):** `/var/www/siac-comensales/storage/biometrics/faces/{cedula}.jpg`
- **Regla de Oro para `C:\crudbase`:**
  1. Configurar `STORAGE_FACES_DIR` mediante una variable de entorno (`BIOMETRIC_FACES_DIR`) que en Debian apunte a una carpeta compartida (ej: `/var/www/shared-biometrics/faces` o `/var/www/siac-comensales/storage/biometrics/faces`).
  2. Así, los cientos de rostros que ya fueron enrolados en Comedores **están disponibles desde el Día 1 en el Sistema de Pagos** sin volver a tomarle foto a ningún trabajador.
  3. Para poblar los **biométricos nuevos de Caja**, basta con ejecutar un script masivo usando `pushUserAndFaceToDevice()` (`face.ts`) que recorra la tabla `Empleado` de `db_ges_comp`, busque su `{cedula}.jpg` en disco y lo inyecte en los terminales nuevos de Caja.

### 2. Mapeo del Modelo de Datos en `C:\crudbase\prisma\schema.prisma`
1. **En el modelo `Branch` (Sedes: PLC, MSB, etc.) o en un nuevo modelo `TerminalBiometricoCaja`:**
   Agregar los campos de conexión del biométrico nuevo de cada sede/taquilla:
   - `deviceIp String? @map("device_ip")`
   - `devicePort Int @default(443) @map("device_port")`
   - `deviceUser String @default("admin") @map("device_user")`
   - `devicePassword String? @map("device_password")`
   - `deviceEnabled Boolean @default(false) @map("device_enabled")`
2. **En el modelo `Empleado` (línea 317 de `schema.prisma`):**
   - Ya cuenta con `cedula @unique`, `nombres`, `apellidos`, `fotoUrl`, `plantillaHuella` y `descriptorFacial`.
   - La `cedula` sanitizada (`sanitizeEmployeeNo(empleado.cedula)`) es la llave universal que une al `Empleado` con el `employeeNoString` del biométrico Hikvision y con el archivo `{cedula}.jpg`.
3. **En el Desembolso de Caja (`TransaccionPago` - `servicioCajaDesembolso.ts`):**
   - Cuando el trabajador pone su rostro en el biométrico de Taquilla, llega el evento Socket.io `biometric:identified` con su `cedula`.
   - La vista de Caja abre/selecciona automáticamente al trabajador o valida su identidad, y al registrar el desembolso (`POST /api/caja/desembolsar`), envía `metodoValidacion: 'FACIAL'` (que ya existe en el enum `MetodoValidacion` de `schema.prisma`, línea 36).

---

## 🏗️ PARTE 2: Infraestructura Física, Red y Configuración de los Biométricos Nuevos

Al instalar los **biométricos Hikvision MinMoe nuevos** para las taquillas de pago, aplicar desde el primer día:

1. **PROHIBIDO conectarlos por Wi-Fi (Obligatorio Cable de Red UTP RJ45):**
   - El chip Wi-Fi interno de los Hikvision se queda **"embebido" (congelado)** cuando trabaja con platos Wi-Fi empresariales (por *Group Key Rekeying*, *Band Steering* y saturación de celulares en la fila de cobro).
   - **Acción:** Conectar siempre por **cable UTP RJ45** directo al switch y **apagar el interruptor de Wi-Fi** en el menú físico de pantalla del biométrico.
2. **IP Fija y Bypass Total en el Router/Firewall (Especialmente en MSB):**
   - Asignar IP estática a cada biométrico nuevo y registrar su IP/MAC en el **Bypass** del firewall/router de la sede antes de encender el servicio en el servidor.
3. **Desactivar `Face Duplicate Check` en el Biométrico Nuevo:**
   - Entrar por navegador a la IP del biométrico nuevo -> Configuración de Rostros -> Desactivar **"Face Duplicate Check" (Verificación de rostro duplicado)** para que nunca arroje `Face picture already exists` al sincronizar empleados.

---

## 🚨 PARTE 3: Las Reglas Inquebrantables de Código para Pagos Biométricos

1. **PROHIBIDO crear `new https.Agent()` por petición (`client.ts`):**  
   Mantener siempre el `sharedHttpsAgent` con `keepAlive: true, maxSockets: 10` y `res.resume()` en `fetchDeviceChallenge`.
2. **PROHIBIDO hacer bucles de sondeo sin Circuit Breaker (`acsPolling.ts`):**  
   Mantener siempre `consecutiveErrors >= 5` -> `safeClose()`. Si la sede de MSB pierde internet por horas, el bucle de 200ms se detiene en 10 segundos y pasa al supervisor (1 intento cada 60s), manteniendo el servidor Debian al 100% de rendimiento.
3. **PROHIBIDO hacer `removeAllListeners()` sin `.on('error', () => {})` antes de `.destroy()` (`streamConnection.ts`):**  
   Evita caídas del servidor por `[uncaughtException] Error: socket hang up`.
4. **PROHIBIDO ejecutar pagos o desembolsos leyendo el historial viejo del biométrico (`offlineSync`):**  
   - En un **Sistema de Pagos**, jamás se debe correr un proceso en segundo plano que lea eventos pasados de la memoria del biométrico para dar por pagado a un trabajador.
   - El reconocimiento facial en Caja **SOLO** es válido en **tiempo real** (eventos con antigüedad `< 15 segundos` mientras el cajero tiene abierta la orden de pago en taquilla).
5. **OBLIGATORIO usar Idempotencia Financiera y Firma de Integridad:**  
   Reutilizar `C:\crudbase\server\utils\idempotency.ts` y `C:\crudbase\server\utils\integridadFinanciera.ts` al confirmar el pago facial para garantizar que si el trabajador deja el rostro frente a la cámara 5 segundos seguidos, **jamás** se genere un doble desembolso en `TransaccionPago`.
