# Manual Definitivo de Despliegue — Sistemas SIAC en Debian 13

> **Versión:** 3.0 — 11 de agosto de 2026
> **Autor:** División de Programación
> **Servidor:** Debian 13 (Trixie) — VMware Virtual Platform — 16 GiB RAM

---

## Mapa de Servicios del Servidor

| Sistema | Tecnología | Puerto Node | Puerto Nginx | Acceso |
|---|---|---|---|---|
| **Sistema de Combustible** | Express.js | 3000 | 80 | `http://IP` |
| **SIAC Comensales** | Nuxt 3 + Prisma | 3001 | 8080 | `http://IP:8080` |
| **SIAC Inventario** | Nuxt 3 + Prisma | 3002 | 8081 | `http://IP:8081` |
| **Cockpit** (Panel de administración) | — | — | 9090 | `https://IP:9090` |

---

# PARTE 1 — PREPARACIÓN DEL SERVIDOR (Solo una vez)

---

## 1.1. Repositorios y herramientas básicas

```bash
# Eliminar repositorio del CD-ROM (solo instalaciones frescas)
sed -i '/cdrom/d' /etc/apt/sources.list

# Configurar repositorios oficiales
echo "deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware" > /etc/apt/sources.list

# Actualizar e instalar herramientas
apt update && apt upgrade -y
apt install -y curl git nano htop build-essential
timedatectl set-timezone America/Caracas
```

---

## 1.2. PostgreSQL

```bash
# Instalar
apt install -y postgresql postgresql-contrib

# Configurar contraseña y crear las bases de datos
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'root';\""
su - postgres -c "psql -c \"CREATE DATABASE siac_comensales OWNER postgres;\""
su - postgres -c "psql -c \"CREATE DATABASE siac_inventario OWNER postgres;\""
```

### Acceso remoto (opcional — para pgAdmin/DBeaver)
```bash
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               scram-sha-256" >> /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql
```

---

## 1.3. Node.js 24 con NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
```

---

## 1.4. PM2 (Gestor de procesos)

```bash
npm install -g pm2
```

---

## 1.5. Nginx

```bash
# Desactivar Apache si está instalado
systemctl stop apache2
systemctl disable apache2

# Instalar Nginx
apt install -y nginx

# Eliminar configuración por defecto (opcional)
rm -f /etc/nginx/sites-enabled/default
```

---

## 1.6. Cockpit (Panel de administración web)

```bash
apt install -y cockpit
systemctl enable --now cockpit.socket
```

Acceso: `https://IP_SERVIDOR:9090` (usuario `root`)

---

## 1.7. Symlink global de Node modules (CRÍTICO)

El motor de Nuxt (Nitro) internamente busca módulos desde la raíz del sistema (`/node_modules/`). Sin este enlace simbólico, las aplicaciones Nuxt **no arrancarán**.

```bash
ln -sf /var/www/siac-comensales/node_modules /node_modules
```

> [!IMPORTANT]
> - No ocupa espacio (es solo un atajo)
> - No afecta otros sistemas del servidor
> - **No borrar nunca**

---

# PARTE 2 — DESPLIEGUE DE SIAC COMENSALES

---

## 2.1. Clonar e instalar

```bash
cd /var/www
git clone https://github.com/leonardoespina/siac-comensales.git
cd siac-comensales
npm install
```

### Aprobar scripts bloqueados por NPM
```bash
npm approve-scripts esbuild
npm approve-scripts prisma
npm approve-scripts tesseract.js
npm approve-scripts @parcel/watcher
npm approve-scripts @prisma/engines
npm rebuild
```

---

## 2.2. Variables de entorno

```bash
cat <<EOF > .env
DATABASE_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
DIRECT_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
JWT_SECRET="sigac_secret_super_seguro_2025"
EOF
```

---

## 2.3. Base de datos con Prisma

```bash
npx prisma generate
npx prisma db push
```

---

## 2.4. Parche de cookie para HTTP (redes internas sin HTTPS)

```bash
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts
```

> [!NOTE]
> Si el código ya tiene `secure: false` o `getRequestURL`, este paso no es necesario.

---

## 2.5. Compilar

```bash
npm run build
```

> Si Nuxt pregunta sobre telemetría, selecciona "No".

---

## 2.6. Verificar manualmente (opcional pero recomendado)

```bash
DATABASE_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public" \
JWT_SECRET="sigac_secret_super_seguro_2025" \
PORT=3001 node .output/server/index.mjs
```

Debes ver:
```
🎧 Inicializando Event Listeners de Comensales...
Listening on http://[::]:3001
```

Presiona `Ctrl+C` para detener.

---

## 2.7. Configurar PM2

```bash
cat <<'EOF' > /var/www/siac-comensales/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'siac-comensales',
    script: '.output/server/index.mjs',
    cwd: '/var/www/siac-comensales',
    env: {
      PORT: 3001,
      DATABASE_URL: 'postgresql://postgres:root@localhost:5432/siac_comensales?schema=public',
      DIRECT_URL: 'postgresql://postgres:root@localhost:5432/siac_comensales?schema=public',
      JWT_SECRET: 'sigac_secret_super_seguro_2025'
    }
  }]
}
EOF

pm2 start ecosystem.config.cjs
```

---

## 2.8. Configurar Nginx (puerto 8080)

```bash
cat <<'EOF' > /etc/nginx/sites-available/siac-comensales
server {
    listen 8080;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -s /etc/nginx/sites-available/siac-comensales /etc/nginx/sites-enabled/
systemctl restart nginx
```

---

## 2.9. Verificar

Abrir en el navegador: `http://IP_SERVIDOR:8080/`

---

# PARTE 3 — DESPLIEGUE DE SIAC INVENTARIO

> [!NOTE]
> Misma estructura que Comensales. Solo cambian la carpeta, base de datos y puertos.

---

## 3.1. Clonar e instalar

```bash
cd /var/www
git clone <URL_DEL_REPO_INVENTARIO> siac-inventario
cd siac-inventario
npm install
npm approve-scripts esbuild
npm approve-scripts prisma
npm approve-scripts tesseract.js
npm approve-scripts @parcel/watcher
npm approve-scripts @prisma/engines
npm rebuild
```

---

## 3.2. Variables de entorno

```bash
cat <<EOF > .env
DATABASE_URL="postgresql://postgres:root@localhost:5432/siac_inventario?schema=public"
DIRECT_URL="postgresql://postgres:root@localhost:5432/siac_inventario?schema=public"
JWT_SECRET="sigac_secret_super_seguro_2025"
EOF
```

---

## 3.3. Base de datos, parche y compilación

```bash
npx prisma generate
npx prisma db push
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts
npm run build
```

---

## 3.4. Configurar PM2

```bash
cat <<'EOF' > /var/www/siac-inventario/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'siac-inventario',
    script: '.output/server/index.mjs',
    cwd: '/var/www/siac-inventario',
    env: {
      PORT: 3002,
      DATABASE_URL: 'postgresql://postgres:root@localhost:5432/siac_inventario?schema=public',
      DIRECT_URL: 'postgresql://postgres:root@localhost:5432/siac_inventario?schema=public',
      JWT_SECRET: 'sigac_secret_super_seguro_2025'
    }
  }]
}
EOF

pm2 start ecosystem.config.cjs
```

---

## 3.5. Configurar Nginx (puerto 8081)

```bash
cat <<'EOF' > /etc/nginx/sites-available/siac-inventario
server {
    listen 8081;
    server_name _;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -s /etc/nginx/sites-available/siac-inventario /etc/nginx/sites-enabled/
systemctl restart nginx
```

---

## 3.6. Verificar

Abrir en el navegador: `http://IP_SERVIDOR:8081/`

---

# PARTE 4 — FINALIZAR DESPLIEGUE

Después de levantar todos los sistemas:

```bash
# Guardar estado de PM2
pm2 save

# Configurar auto-inicio al reiniciar el servidor (como root)
env PATH=$PATH:/root/.nvm/versions/node/v24.19.0/bin pm2 startup systemd -u root --hp /root

# Verificar todo
pm2 status
```

> [!WARNING]
> Si existiera un servicio viejo `pm2-soporte`, eliminarlo:
> ```bash
> systemctl stop pm2-soporte
> systemctl disable pm2-soporte
> rm -f /etc/systemd/system/pm2-soporte.service
> systemctl daemon-reload
> systemctl reset-failed
> ```

---

# PARTE 5 — MANTENIMIENTO Y OPERACIÓN

---

## Comandos PM2

| Acción | Comando |
|---|---|
| Ver todos los procesos | `pm2 status` |
| Reiniciar un servicio | `pm2 restart siac-comensales` |
| Reiniciar todos | `pm2 restart all` |
| Detener un servicio | `pm2 stop siac-comensales` |
| Monitoreo visual en tiempo real | `pm2 monit` |
| Limpiar historial de logs | `pm2 flush` |

---

## Logs

| Qué ver | Comando |
|---|---|
| Logs de Comensales | `pm2 logs siac-comensales --lines 30 --nostream` |
| Logs de Inventario | `pm2 logs siac-inventario --lines 30 --nostream` |
| Logs de Combustible | `pm2 logs backend-sc --lines 30 --nostream` |
| Logs en tiempo real (todos) | `pm2 logs` |
| Logs de Nginx (accesos) | `tail -30 /var/log/nginx/access.log` |
| Logs de Nginx (errores) | `tail -30 /var/log/nginx/error.log` |
| Logs de Nginx en vivo | `tail -f /var/log/nginx/error.log` |

---

## Verificar puertos en uso

```bash
ss -tlnp | grep -E ':(80|8080|8081|3000|3001|3002|9090)'
```

---

## Acceso a PM2 como usuario normal

PM2 fue instalado bajo `root` con NVM. Para administrarlo:
```bash
su -
pm2 status
```

---

# PARTE 6 — ACTUALIZACIÓN DE SISTEMAS

Cuando necesites desplegar una nueva versión de cualquier sistema SIAC:

```bash
cd /var/www/<CARPETA_DEL_PROYECTO>

# 1. Descargar últimos cambios
git pull origin main

# 2. Instalar dependencias nuevas (si las hay)
npm install

# 3. Re-aplicar parche de cookie (si fue sobreescrito por el pull)
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts

# 4. Aplicar cambios de base de datos (si los hay)
npx prisma generate
npx prisma db push

# 5. Recompilar
npm run build

# 6. Reiniciar
pm2 restart <NOMBRE_EN_PM2>
```

### Referencia de nombres

| Sistema | Carpeta | Nombre PM2 |
|---|---|---|
| Comensales | `/var/www/siac-comensales` | `siac-comensales` |
| Inventario | `/var/www/siac-inventario` | `siac-inventario` |

---

# PARTE 7 — TROUBLESHOOTING

## Error: `Cannot find module 'pg'`
**Causa:** El symlink `/node_modules` no existe o fue borrado.
**Solución:**
```bash
ln -sf /var/www/siac-comensales/node_modules /node_modules
pm2 restart all
```

## Error: `SASL: client password must be a string`
**Causa:** Las variables de entorno no llegan al proceso de PM2.
**Solución:** Verificar que el archivo `ecosystem.config.cjs` tenga la `DATABASE_URL` correcta y reiniciar:
```bash
pm2 delete <nombre>
cd /var/www/<carpeta>
pm2 start ecosystem.config.cjs
pm2 save
```

## Error: `502 Bad Gateway`
**Causa:** La aplicación Node.js no está corriendo en el puerto esperado.
**Solución:**
```bash
# Verificar si el proceso está vivo
pm2 status

# Si está muerto, revisar logs
pm2 logs <nombre> --lines 30 --nostream

# Si no existe, arrancarlo
cd /var/www/<carpeta>
pm2 start ecosystem.config.cjs
pm2 save
```

## Error: Login funciona pero todo da 401
**Causa:** La cookie de sesión tiene `secure: true` y el servidor usa HTTP.
**Solución:**
```bash
cd /var/www/<carpeta>
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts
npm run build
pm2 restart <nombre>
```
Limpiar cookies del navegador y volver a hacer login.

## PM2 no arranca automáticamente al reiniciar
**Causa:** El servicio de systemd no está configurado o está mal configurado.
**Solución:**
```bash
pm2 save
env PATH=$PATH:/root/.nvm/versions/node/v24.19.0/bin pm2 startup systemd -u root --hp /root
```

## El servicio `pm2-soporte` aparece como fallido en Cockpit
**Causa:** Se creó un servicio de auto-inicio bajo el usuario `soporte` que no tiene acceso a NVM.
**Solución:**
```bash
systemctl stop pm2-soporte
systemctl disable pm2-soporte
rm -f /etc/systemd/system/pm2-soporte.service
systemctl daemon-reload
systemctl reset-failed
```

---

# PARTE 8 — NOTAS TÉCNICAS

### ¿Por qué el symlink `/node_modules`?
Nuxt (Nitro) usa internamente `createRequire('/_entry.js')`, lo que hace que Node.js resuelva módulos desde la raíz del sistema de archivos (`/`). El symlink redirige `/node_modules/` hacia los módulos reales del proyecto. Es un comportamiento específico de Prisma + Nitro.

### ¿Por qué `ecosystem.config.cjs` en vez de variables en línea?
PM2 no siempre pasa correctamente las variables de entorno declaradas en la línea de comandos (`VAR=x pm2 start ...`). El archivo `ecosystem.config.cjs` garantiza que las variables se inyecten al proceso de forma confiable.

### ¿Por qué el parche `secure: false`?
En redes internas sin HTTPS, el flag `Secure` de las cookies impide que el navegador las envíe por HTTP. Esto hace que el login funcione pero todas las peticiones posteriores devuelvan 401. El parche desactiva este flag para permitir el funcionamiento por HTTP.

### Ahorrar RAM desactivando el escritorio
```bash
systemctl set-default multi-user.target
```
