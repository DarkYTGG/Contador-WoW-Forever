@echo off
title World of Warcraft: Forever - Contador de Lanzamiento
cd /d "%~dp0"

echo ========================================================
echo    WORLD OF WARCRAFT FOREVER - CUENTA REGRESIVA
echo ========================================================
echo.
echo Iniciando servidor local para la mejor experiencia de audio...
echo Abriendo en tu navegador predeterminado...
echo.

start "" "http://localhost:8080"
python -m http.server 8080
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python no respondio, abriendo archivo HTML directamente...
    start "" "%~dp0index.html"
)
pause

