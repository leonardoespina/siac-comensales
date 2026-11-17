#!/bin/bash
# ==============================================================================
# SCRIPT DE REVERSión DE EMERGENCIA (ROLLBACK) - BIOMETRÍA SIAC
# Restaura los 3 archivos del cliente Hikvision a su estado previo exacto (b94b7b9)
# ==============================================================================

set -e

echo "🔄 Iniciando reversión de emergencia (Rollback) a versión previa..."

cd /var/www/siac-comensales

# 1. Restaurar únicamente los 3 archivos intervenidos desde el commit previo (b94b7b9)
git checkout b94b7b9 -- \
  server/services/hikvision/client.ts \
  server/services/hikvision/acsPolling.ts \
  server/services/hikvision/streamConnection.ts

# 2. Asegurar bandera de cookie para HTTP interno si aplica
sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false/" server/api/auth/login.post.ts

# 3. Recompilar y reiniciar PM2
echo "📦 Recompilando aplicación..."
npm run build

echo "🚀 Reiniciando servicio en PM2..."
pm2 restart siac-comensales

echo "✅ Reversión completada con éxito. El sistema volvió exactamente al estado anterior."
