# Convención de identificadores del CRM Atlantic City

## Formato

Los identificadores primarios usan texto con prefijo y secuencia de tres o más dígitos: `PREFIJO-001`. Cada tabla mantiene su propia secuencia.

| Entidad / rol | Prefijo |
|---|---|
| Cliente y cuenta de cliente | `CLI` |
| Administrador | `ADM` |
| Manager demo (rol interno EMPLOYEE) | `MAN` |
| Empleado creado desde el panel | `EMP` |
| Marketing | `MKT` |
| Campaña | `CAM` |
| Beneficio | `BEN` |
| Restaurante | `RES` |
| Reserva | `RVA` |
| Evento | `EVT` |
| Inscripción a evento | `INS` |
| Ticket | `TKT` |
| Venta | `VEN` |
| Asignación de beneficio | `ASG` |
| Transacción de puntos | `LPT` |
| Historial VIP | `VTH` |
| Historial de ticket | `THI` |
| Auditoría | `AUD` |
| Integración | `INT` |
| Evento de integración | `IEV` |
| Actividad del cliente | `ACT` |
| Regla de puntos | `LPR` |

## Reglas de integridad

- Las claves foráneas conservan exactamente el nuevo identificador de su registro padre.
- La cuenta de acceso de un cliente usa el mismo código `CLI-nnn` que su ficha de cliente; son tablas distintas y `users.client_id` apunta a `clients.id`.
- Los roles funcionales existentes no se alteran: `ADMIN`, `EMPLOYEE`, `MARKETING` y `CLIENT`. El usuario de demostración de manager sigue usando el rol `EMPLOYEE`, pero su ID visible es `MAN-001`.
- Los IDs creados por el backend se generan con el prefijo de la entidad y la secuencia correspondiente.
- No se deben cambiar IDs manualmente en una base de datos en producción. Para una base anterior se incluye `backend/database/migration_001_prefixed_ids.sql`.

## Migración

La base de datos incluida en este paquete ya tiene los IDs migrados y sus relaciones verificadas. Para una instalación anterior, haga una copia de seguridad y ejecute el script SQL de migración una sola vez sobre la base existente. El script desactiva temporalmente la comprobación de claves foráneas, actualiza referencias y claves primarias, y vuelve a activar la comprobación al terminar.

## Verificación

Desde `backend` ejecute:

```bash
npm run test:sqlite
```

La prueba comprueba la integridad SQLite, las claves foráneas y los flujos básicos del CRM.
