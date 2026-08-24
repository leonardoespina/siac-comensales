# 📘 Manual 1: Instalación desde Cero y Compilación en Debian 13

Este manual explica cómo instalar todas las dependencias, clonar el repositorio, sincronizar la base de datos y compilar **SIAC Comensales (Nuxt 3)** en un servidor **Debian 13 (Trixie)**.

---

## 📌 Requisitos Previos (Solo se hace la primera vez)

Conéctate como usuario **`root`** (`su -`):

```bash
# 1. Repositorios y herramientas básicas
sed -i '/cdrom/d' /etc/apt/sources.list
echo "deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware" > /etc/apt/sources.list

apt update && apt upgrade -y
apt install -y curl git nano htop build-essential nginx postgresql postgresql-contrib
timedatectl set-timezone America/Caracas

# 2. Configurar PostgreSQL
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'root';\""
su - postgres -c "psql -c \"CREATE DATABASE siac_comensales OWNER postgres;\""

# 3. Instalar Node.js 24 y PM2 con NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
npm install -g pm2
```

---

## 🚀 Despliegue y Compilación Paso a Paso

```bash
# 1. Clonar el repositorio
mkdir -p /var/www
cd /var/www
git clone https://github.com/leonardoespina/siac-comensales.git
cd siac-comensales

# 2. Instalar dependencias y autorizar scripts de NPM
npm install
npm approve-scripts esbuild
npm approve-scripts prisma
npm approve-scripts @prisma/engines
npm rebuild

# 3. Crear el Symlink obligatorio de Node Modules
ln -sf /var/www/siac-comensales/node_modules /node_modules

# 4. Crear archivo .env
cat <<EOF > /var/www/siac-comensales/.env
DATABASE_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
DIRECT_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
JWT_SECRET="sigac_secret_super_seguro_2025"
EOF

# 5. Sincronizar Base de Datos con Prisma
npx prisma generate
npx prisma db push

# 6. Aplicar parche de cookie para red local HTTP
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts

# 7. Compilar la Aplicación Nuxt 3 (Build de Producción)
npm run build
```

---

## ⚙️ Configuración de Servicios (PM2 y Nginx)

```bash
# 1. Archivo de configuración de PM2
cat <<'EOF' > /var/www/siac-comensales/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'siac-app',
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

# 2. Iniciar y guardar servicio en PM2
pm2 start ecosystem.config.cjs
pm2 save
env PATH=$PATH:/root/.nvm/versions/node/v24.19.0/bin pm2 startup systemd -u root --hp /root

# 3. Configurar Nginx (Puerto 8080)
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
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
```
