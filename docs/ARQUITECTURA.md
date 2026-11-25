# Arquitectura

- `frontend/`: interfaz HTML, CSS y JavaScript vanilla.
- `backend/src/app.js`: API REST Express, autenticación JWT, autorización por roles y servidor estático.
- `backend/src/db.js`: conexión SQLite, inicialización automática, consultas parametrizadas, transacciones y health check.
- `backend/database/sqlite-schema.sql`: esquema relacional SQLite.
- `backend/scripts/`: configuración inicial, datos demo y prueba de esquema.
- `database/`: ubicación predeterminada del archivo `atlantic_crm.db`.

La aplicación no necesita SQL Server. SQLite es apropiado para una instancia de CRM con un servidor de aplicación y concurrencia moderada. Si se requiere escritura concurrente desde múltiples servidores de aplicación, conviene migrar a PostgreSQL.
