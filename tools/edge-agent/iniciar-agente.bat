@echo off
title SIAC Kiosk Edge Agent (Validacion Local 0ms)
cd /d "%~dp0"
echo ========================================================
echo  Iniciando SIAC Kiosk Edge Agent (Validacion Local 0ms)
echo ========================================================

if exist server.cjs (
    node server.cjs
) else (
    call npx tsx edgeServer.ts
)

pause
