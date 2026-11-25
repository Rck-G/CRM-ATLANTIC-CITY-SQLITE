# Instalación — CRM Atlantic City SQLite Edition

## Requisitos

- Node.js 22.13 o superior y npm.
- No se requiere SQL Server, SSMS ni credenciales de base de datos.

## Windows

1. Descomprime el ZIP.
2. Ejecuta `instalar.bat`. Se crea `backend/.env` con `JWT_SECRET` e `INTEGRATION_WEBHOOK_SECRET` aleatorios y se instalan dependencias.
3. Ejecuta `iniciar.bat`.
4. Abre `http://localhost:3000` y crea el primer administrador.

## Manual

Desde la carpeta raíz del proyecto:

```bash
npm install
node backend/scripts/setup.js
npm start
```

El backend crea `database/atlantic_crm.db` y aplica el esquema `backend/database/sqlite-schema.sql` automáticamente. La ubicación se configura mediante `SQLITE_FILE` en `backend/.env`.

## Diagnóstico

Abre `http://localhost:3000/api/health`. La respuesta correcta incluye `ok: true` y `engine: SQLite`.

## Datos de prueba

En desarrollo únicamente, define `SEED_DEMO_DATA=true` y ejecuta `npm run seed:demo`. El proceso es idempotente para los registros de demostración. No lo ejecutes en producción.

## Seguridad y operación

- Mantén `backend/.env` privado y fuera del control de versiones.
- Usa una contraseña fuerte para el administrador.
- Restringe el acceso de red al servidor de la aplicación.
- Configura copias de seguridad periódicas del archivo SQLite.
- Detén el backend antes de copiar manualmente la base de datos.
