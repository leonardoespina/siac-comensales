// Script temporal para evitar que un Web Service gratuito de Render.com entre en suspensión (Sleep).
// Render apaga los servidores gratuitos después de 15 minutos sin tráfico.
// Este script hace una petición ("ping") a la URL cada 10 minutos para mantenerlo despierto.

const https = require('https');

// 🔴 REEMPLAZA ESTO CON LA URL DE TU BACKEND EN RENDER (Ej: https://mi-backend-siac.onrender.com)
const RENDER_URL = 'https://tu-aplicacion.onrender.com';

const pingRender = () => {
  https.get(RENDER_URL, (res) => {
    console.log(`[${new Date().toLocaleTimeString()}] Ping a Render exitoso. Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Error haciendo ping a Render:`, err.message);
  });
};

console.log('🚀 Iniciando script Anti-Sleep para Render...');
console.log(`📡 Haciendo ping a ${RENDER_URL} cada 10 minutos...`);

// Hacer el primer ping inmediatamente
pingRender();

// Repetir cada 10 minutos (10 * 60 * 1000 = 600,000 milisegundos)
setInterval(pingRender, 600000);
