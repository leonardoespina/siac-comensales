@echo off
title Instalador SIAC Edge Agent - Inicio Automatico
echo ========================================================
echo  Instalando SIAC Edge Agent en el Inicio de Windows...
echo ========================================================

set SCRIPT_DIR=%~dp0
set VBS_TARGET=%SCRIPT_DIR%iniciar-silencioso.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\SIAC_Edge_Agent.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_TARGET%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo [EXITO] Acceso directo creado en: %STARTUP_DIR%
    echo El agente se iniciara solo cada vez que encienda esta PC.
    echo.
) else (
    echo.
    echo [ERROR] No se pudo crear el acceso directo de inicio automatico.
    echo.
)

pause
