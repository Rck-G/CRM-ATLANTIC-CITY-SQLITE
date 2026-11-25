# Base de datos SQLite

La edición SQLite utiliza un único archivo local, por defecto `database/atlantic_crm.db`. No requiere un servicio de base de datos separado.

- Esquema: `backend/database/sqlite-schema.sql`.
- Inicialización: automática al iniciar `backend/src/app.js`.
- Motor: `node:sqlite` integrado en Node.js 22.13+.
- Claves: UUID en texto, restricciones UNIQUE, claves foráneas e índices.
- Consultas: parámetros nombrados y transacciones para operaciones multi-tabla.

La base incluye usuarios, clientes, actividad, campañas, beneficios, asignaciones, tickets, auditoría, integraciones, restaurantes, reservas, eventos, inscripciones, ventas y tablas de fidelización. Los umbrales iniciales son Silver 0, Gold 500 y Platinum 1.500.

La ubicación se puede cambiar con `SQLITE_FILE`. Para respaldar, detén el servidor y copia el archivo `.db`. Los archivos SQL Server históricos están en `legacy/sqlserver/` y no se ejecutan en esta edición.
