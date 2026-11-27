# Base de datos y modelo de información

## 1. Tecnología y archivo

La aplicación utiliza SQLite mediante el módulo `node:sqlite` incluido en Node.js 22.13 o superior.

- Archivo predeterminado: `database/atlantic_crm.db`.
- Variable de configuración: `SQLITE_FILE`.
- Definición del esquema: `backend/database/sqlite-schema.sql`.
- Inicialización: automática al iniciar el backend.
- Claves primarias: identificadores UUID almacenados como texto.
- Relaciones: claves foráneas.
- Integridad: restricciones `UNIQUE`, `CHECK` e índices definidos en el esquema.

No es necesario crear las tablas manualmente.

## 2. Dominios funcionales

El modelo relacional cubre los siguientes dominios:

| Dominio | Entidades principales | Propósito |
|---|---|---|
| Seguridad y usuarios | `users`, `audit_events` | Cuentas, roles y trazabilidad |
| Clientes | `clients`, `client_activity` | Datos de cliente y actividad |
| Marketing | `campaigns`, `benefits`, `benefit_assignments` | Campañas y beneficios |
| Atención | `tickets`, `ticket_history` | Solicitudes y seguimiento |
| Integraciones | `integrations`, `sales` | Conectividad y operaciones de venta |
| Restaurantes | `restaurants`, `reservations` | Oferta gastronómica y reservas |
| Eventos | `events`, `event_registrations` | Agenda, aforo e inscripciones |
| Fidelización | tablas de reglas, movimientos y configuración de puntos | Categorías y acumulación de puntos |

La definición completa y vigente de tablas, columnas, claves e índices se encuentra en `backend/database/sqlite-schema.sql`.

## 3. Fidelización

Los valores iniciales de referencia son:

- Silver: desde 0 puntos.
- Gold: desde 500 puntos.
- Platinum: desde 1.500 puntos.

La configuración de niveles y reglas puede administrarse desde el módulo de fidelización según los permisos del usuario. Las operaciones de puntos deben conservar su motivo y trazabilidad.

## 4. Consultas y transacciones

El acceso a datos se centraliza en `backend/src/db.js`. Las consultas parametrizadas reducen el riesgo de inyección SQL. Las operaciones que modifican varias entidades relacionadas deben ejecutarse dentro de transacciones para mantener la consistencia.

## 5. Integridad y mantenimiento

- Las claves foráneas se habilitan en la conexión.
- Los identificadores externos de operaciones que requieren idempotencia deben mantenerse estables.
- No se deben editar manualmente las tablas mientras la aplicación está en uso.
- Antes de cualquier mantenimiento, detener el backend y respaldar el archivo de datos.
- Tras restaurar una copia, iniciar el servicio y validar `/api/health` y los módulos principales.

## 6. Ubicación personalizada

En `backend/.env`:

```dotenv
SQLITE_FILE=./database/atlantic_crm.db
```

Se admite una ruta relativa al proyecto o una ruta absoluta. Asegúrese de que el usuario del sistema operativo tenga permisos de lectura y escritura en la ubicación elegida.
