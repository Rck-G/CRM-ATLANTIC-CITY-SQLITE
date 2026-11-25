@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.env" (
  echo No existe backend\.env. Ejecute instalar.bat primero.
  pause
  exit /b 1
)
call npm start
