# CRM Atlantic City — SQLite Edition

CRM web de Atlantic City con Node.js, Express, interfaz HTML/CSS/JavaScript y base de datos SQLite local. Esta edición conserva los módulos y la interfaz del proyecto original y sustituye la conexión SQL Server por un archivo SQLite.

## Requisitos

- Windows 10/11, macOS o Linux.
- **Node.js 22.13 o superior** (usa el módulo SQLite integrado `node:sqlite`).
- npm incluido con Node.js.

## Instalación en Windows

1. Descomprime el ZIP en una carpeta con permisos de escritura.
2. Ejecuta `instalar.bat`. El instalador crea `backend/.env` con secretos aleatorios e instala las dependencias.
3. Ejecuta `iniciar.bat`.
4. Abre `http://localhost:3000`.
5. En el primer acceso, selecciona **Configurar primer administrador** y crea tu usuario con una contraseña segura (mínimo 12 caracteres).

La base de datos se crea automáticamente en `database/atlantic_crm.db` al iniciar el backend por primera vez. No hay que ejecutar scripts SQL manualmente.

## Instalación manual

```bash
npm install
node backend/scripts/setup.js
npm start
```

Abre `http://localhost:3000`. La ruta del archivo se puede cambiar en `backend/.env` con `SQLITE_FILE`.

## Datos demo (opcional)

Solo para desarrollo o demostración. No ejecutes este paso con datos reales ni en producción.

PowerShell:

```powershell
$env:SEED_DEMO_DATA="true"
npm run seed:demo
```

CMD:

```cmd
set SEED_DEMO_DATA=true && npm run seed:demo
```

Cuentas demo:

| Perfil        | Correo                                 | Contraseña           |
| ------------- | -------------------------------------- | -------------------- |
| Administrador | `admin@demo.atlantic.local`            | `DemoAdmin#2026`     |
| Operaciones   | `manager@demo.atlantic.local`          | `DemoManager#2026`   |
| Marketing     | `marketing@demo.atlantic.local`        | `DemoMarketing#2026` |
| Silver        | `lucia.ramirez@demo.atlantic.local`    | `DemoCliente#101`    |
| Gold          | `mateo.fernandez@demo.atlantic.local`  | `DemoCliente#102`    |
| Platinum      | `valentina.torres@demo.atlantic.local` | `DemoCliente#103`    |

La semilla crea clientes con saldos iniciales de 100, 600 y 1.500 puntos, respectivamente, además de campañas, beneficios, restaurantes y ventas ficticias.

## Fidelización

- **Silver:** desde 0 puntos.
- **Gold:** desde 500 puntos.
- **Platinum:** desde 1.500 puntos.

Los umbrales y reglas de acumulación se pueden cambiar desde el panel de fidelización. Las compras POS pagadas acreditan puntos según la regla activa. La referencia de cada venta impide acreditar puntos dos veces. El administrador puede asignar manualmente un nivel, reactivar el cálculo automático y ajustar puntos dejando un motivo e historial.

## Base de datos y copias de seguridad

- Esquema activo: `backend/database/sqlite-schema.sql`.
- Archivo predeterminado: `database/atlantic_crm.db`.
- Respalda el archivo `.db` con el backend detenido, o usa una copia consistente del archivo junto con sus archivos WAL/SHM si el sistema está en ejecución.
- No borres el archivo `.db`: contiene los usuarios, clientes, ventas, reservas, campañas y demás datos del CRM.
- Para restaurar, detén el CRM y reemplaza el archivo por una copia de seguridad válida.

## Comprobaciones

```bash
npm run check
npm run test:sqlite
```

`GET /api/health` informa el estado de SQLite. Para producción, usa HTTPS, protege `backend/.env`, limita el acceso al equipo que aloja el CRM y configura copias de seguridad periódicas.

## Estructura relevante

- `backend/src/app.js`: API REST y servidor web.
- `backend/src/db.js`: adaptador SQLite, consultas parametrizadas y transacciones.
- `backend/database/sqlite-schema.sql`: esquema SQLite.
- `backend/scripts/setup.js`: configuración inicial y generación de secretos.
- `backend/scripts/seed-demo.js`: datos ficticios opcionales.
- `frontend/`: interfaz del CRM.
- `legacy/sqlserver/`: scripts SQL Server históricos conservados solo como referencia; no son usados por esta edición.
- `legacy/documentacion-original/`: documentos de diseño y normalización de la versión anterior.
