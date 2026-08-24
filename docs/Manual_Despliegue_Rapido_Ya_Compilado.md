# ⚡ Manual 2: Despliegue Rápido con Build ya Compilado (.output)

Este manual es ideal para desplegar en un servidor Debian sin necesidad de compilar código fuente, usando directamente la carpeta `.output` generada previamente.

---

## 📦 ¿Qué archivos se necesitan transferir al servidor?

Desde tu máquina local o repositorio, solo necesitas copiar a `/var/www/siac-comensales/`:
1. Carpeta **`.output/`** (Generada con `npm run build`).
2. Carpeta **`prisma/`** (Contiene `schema.prisma`).
3. Archivo **`package.json`**.

---

## 🚀 Despliegue en 3 Pasos en Debian

### 1️⃣ Instalar dependencias de producción y Prisma
```bash
cd /var/www/siac-comensales

# Instalar Prisma para el runtime
npm install prisma @prisma/client
npx prisma generate
npx prisma db push
```

### 2️⃣ Crear archivo de configuración `.env`
```bash
cat <<EOF > /var/www/siac-comensales/.env
DATABASE_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
DIRECT_URL="postgresql://postgres:root@localhost:5432/siac_comensales?schema=public"
JWT_SECRET="sigac_secret_super_seguro_2025"
EOF
```

### 3️⃣ Iniciar directamente con PM2
```bash
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

pm2 start ecosystem.config.cjs
pm2 save
```

---

## 🔄 Para Actualizar en el Futuro (Cuando subas un nuevo `.output`):
```bash
cd /var/www/siac-comensales
npx prisma db push
pm2 restart siac-app
```
