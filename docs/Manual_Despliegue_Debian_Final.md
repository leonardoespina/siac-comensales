# Manual Definitivo de Despliegue del Sistema de Combustible

Este manual documenta el procedimiento exacto y pulido para instalar el Sistema de Combustible (Frontend + Backend + Base de Datos) desde cero en un servidor **Debian 13 (Trixie)**, sorteando todos los obstáculos técnicos encontrados.

> [!IMPORTANT]
> Todos los comandos asumen que estás conectado como usuario **`root`**.

---

## FASE 1: Preparación del Sistema

### 1.1. Corregir el repositorio del CD-ROM
En instalaciones frescas de Debian, el sistema intenta buscar actualizaciones en el CD/USB de instalación. Para desactivarlo y usar internet:
```bash
sed -i '/cdrom/d' /etc/apt/sources.list
```

### 1.2. Configurar los repositorios oficiales
Si `apt update` falla por no encontrar repositorios, reescribe el archivo con los oficiales de Debian 13:
```bash
echo "deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware" > /etc/apt/sources.list
```
Luego actualiza el sistema:
```bash
apt update && apt upgrade -y
```

### 1.3. Instalar herramientas básicas y Zona Horaria
```bash
apt install -y curl git nano htop build-essential
timedatectl set-timezone America/Caracas
```

---

## FASE 2: Base de Datos (PostgreSQL)

### 2.1. Instalación y Configuración Inicial
```bash
apt install -y postgresql postgresql-contrib
```
Entrar a la consola de Postgres (`su - postgres -c "psql"`) y configurar el usuario/DB:
```sql
ALTER USER postgres WITH PASSWORD 'root';
CREATE DATABASE db_combustible OWNER postgres;
\q
```

### 2.2. Habilitar Acceso Remoto (pgAdmin/DBeaver)
Para poder conectar herramientas externas desde Windows:
```bash
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               scram-sha-256" >> /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql
```
*(Ya puedes importar tu archivo `.sql` desde tu computadora).*

---

## FASE 3: Entorno Backend (Node.js 24 y PM2)

### 3.1. Instalación Profesional con NVM
Para forzar la versión más reciente (Node 24) saltándonos las restricciones de Debian:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
```

### 3.2. Instalación de PM2
```bash
npm install -g pm2
```

---

## FASE 4: Despliegue del Backend

### 4.1. Descarga y Dependencias
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/leonardoespina/backSC.git
cd backSC
npm install
```

### 4.2. Variables de Entorno (`.env`)
Crear el archivo con la clave correcta (`DB_PASS`):
```bash
cat <<EOF > .env
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASS=root
DB_NAME=db_combustible
JWT_SECRET=tu_secreto_seguro
EOF
```

### 4.3. Encendido Automático (PM2)
Arrancar el servicio (el entrypoint es `app.js`):
```bash
pm2 start app.js --name "backend-sc"
pm2 save
pm2 startup
```
*(Copiar y ejecutar el comando `sudo env PATH...` que arroja PM2 al final).*

---

## FASE 5: Despliegue del Frontend y Nginx

### 5.1. Preparación y Compilación
```bash
cd /var/www
git clone https://github.com/leonardoespina/sistemaCombustibleFront.git
cd sistemaCombustibleFront
npm install
```

Configurar las variables de entorno para usar el Proxy Inverso relativo:
```bash
cat <<EOF > .env.production
VITE_API_BASE_URL=
VITE_SOCKET_URL=
EOF
```
*(Nota: Se deben dejar **vacías** en Vite para que el código asuma `/api` automáticamente y no genere el error `http://api/`).*

Compilar la aplicación:
```bash
npm run build
```

### 5.2. Instalación y Limpieza del Puerto 80
Debian suele preinstalar Apache2, lo cual bloquea a Nginx. Lo desactivamos:
```bash
systemctl stop apache2
systemctl disable apache2
apt install -y nginx
```

### 5.3. Configuración del Servidor Web (Proxy Inverso)
Escribir la configuración de Nginx (apuntando a la carpeta `dist` pura de Vite):
```bash
cat <<'EOF' > /etc/nginx/sites-available/sistemacombustible
server {
    listen 80;
    server_name _;

    root /var/www/sistemaCombustibleFront/dist;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 5.4. Permisos de Seguridad
Asegurarse de que el usuario de Nginx (`www-data`) tenga permisos de lectura sobre la carpeta compilada para evitar errores 500:
```bash
chown -R www-data:www-data /var/www/sistemaCombustibleFront
chmod -R 755 /var/www/sistemaCombustibleFront
```

### 5.5. Encendido Final
```bash
ln -s /etc/nginx/sites-available/sistemacombustible /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
systemctl restart nginx
```

---
> [!TIP]
> Si deseas ahorrar memoria RAM en el servidor apagando el entorno de escritorio (dejándolo solo en consola), ejecuta: `systemctl set-default multi-user.target`.
