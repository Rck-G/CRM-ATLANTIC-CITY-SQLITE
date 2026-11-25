@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   CRM ATLANTIC CITY - SQLITE EDITION
echo ============================================
where node >nul 2>nul
if errorlevel 1 (echo Instale Node.js 22.13 o superior desde https://nodejs.org/ & pause & exit /b 1)
node -e "const v=process.versions.node.split('.').map(Number);if(v[0]<22||(v[0]===22&&v[1]<13))process.exit(1)"
if errorlevel 1 (echo Se requiere Node.js 22.13 o superior. & pause & exit /b 1)
where npm >nul 2>nul
if errorlevel 1 (echo npm no esta disponible. & pause & exit /b 1)
echo Preparando configuracion local...
node backend\scripts\setup.js
if errorlevel 1 (echo No se pudo crear backend\.env. & pause & exit /b 1)
echo Instalando dependencias...
call npm install
if errorlevel 1 (echo Fallo npm install. & pause & exit /b 1)
echo.
echo Instalacion completada. Ejecute iniciar.bat para abrir el CRM.
echo La base SQLite se creara automaticamente en database\atlantic_crm.db.
pause
