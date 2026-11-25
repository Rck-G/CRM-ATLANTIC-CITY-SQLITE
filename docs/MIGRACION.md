# Edición SQLite

Esta distribución sustituye la conexión SQL Server por SQLite local. La interfaz y los módulos funcionales del CRM se conservan. El esquema activo se crea automáticamente desde `backend/database/sqlite-schema.sql`.

Los scripts anteriores de SQL Server se guardan en `legacy/sqlserver/` como referencia histórica y no son utilizados por el backend de esta edición.

La migración de datos desde una base SQL Server existente no se ejecuta automáticamente: antes de usar datos reales, exporta e importa las tablas con una conversión controlada, valida conteos, claves y relaciones y conserva un respaldo de la base original. Esta versión ZIP incluye la aplicación SQLite lista para inicializar una base nueva.
