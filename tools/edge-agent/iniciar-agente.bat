@echo off
title SIAC Kiosk Edge Agent (MSB 0ms)
cd /d "%~dp0"
echo ========================================================
echo  Iniciando SIAC Kiosk Edge Agent (Validacion Local 0ms)
echo ========================================================
call npx tsx edgeServer.ts
pause
