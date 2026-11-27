# Revisión técnica integral y mejoras implementadas

**Proyecto:** CRM Atlantic City  
**Alcance:** inspección estática del código entregado, revisión del esquema SQLite, ejecución de pruebas automatizadas y pruebas HTTP de integración en un entorno temporal.

## 1. Resumen ejecutivo

Se revisaron la interfaz web, el servidor Express, el módulo de acceso a datos, el esquema relacional, los scripts de instalación y datos demo, las dependencias declaradas, la configuración, la documentación y el contenido del paquete distribuido.

La versión revisada contiene 21 tablas de negocio y seguridad. El esquema SQLite superó `PRAGMA integrity_check` y no presentó filas en `PRAGMA foreign_key_check` en la copia de datos examinada.

## 2. Hallazgos y correcciones

| Prioridad | Hallazgo | Corrección aplicada |
|---|---|---|
| Crítica | El ZIP recibido incluía `backend/.env` con secretos reales de firma e integración. | Se excluyó el archivo del paquete final. La instalación genera secretos locales nuevos. Se eliminó también el historial `.git` del entregable. |
| Alta | El ZIP incluía una base de datos local, registros demo y archivos auxiliares WAL/SHM. | Se excluyeron la base de datos y sus archivos temporales del ZIP limpio. Para no perder los registros que venían en el archivo recibido, se generó una copia de datos independiente que se entrega por separado. El esquema se crea al iniciar; los datos demo se cargan solo bajo petición. |
| Alta | Se distribuían `node_modules` y metadatos `.git`, aumentando el paquete y exponiendo historial interno. | Se excluyeron dependencias instaladas e historial del ZIP final. `npm install` reconstruye las dependencias a partir del lockfile. |
| Alta | Un usuario con rol CLIENT podía modificar tickets a través de la ruta genérica de actualización. | Se bloqueó la actualización de tickets por clientes en esa ruta. Los clientes conservan la creación y consulta de sus propios tickets. |
| Alta | El registro público no tenía limitación de intentos y aceptaba contraseñas más cortas que las del administrador inicial. | Se añadió limitación de solicitudes y se unificó la política de contraseña en 12–200 caracteres con validaciones de longitud y campos. |
| Alta | La configuración de Content Security Policy estaba desactivada. | Se habilitó CSP, se retiró el script inline de tema y se definieron directivas restrictivas. Los estilos inline se permiten por la forma en que la interfaz genera algunos componentes. |
| Media | La interfaz enviaba cambios de estado de reservas a una ruta que no estaba implementada. | Se añadió `PATCH /api/reservations/:rid/status` con lista de estados permitidos, control de rol y auditoría. |
| Media | El endpoint de salud exponía la ruta absoluta del archivo de datos. | La respuesta de salud ya no revela la ruta física. |
| Media | Las respuestas API podían quedar almacenadas en caché por el navegador o intermediarios. | Se añadió `Cache-Control: no-store` a las respuestas de API. |
| Media | Los datos recibidos por la integración POS tenían validación insuficiente. | Se añadieron controles de formato y longitud para identificador, importe, estado, origen, moneda, fecha, cliente y metadatos. |
| Media | Un CSV con valores controlados por usuarios podía abrirse en una hoja de cálculo y ejecutar fórmulas. | Se neutralizan prefijos de fórmula al exportar campos CSV. |
| Media | Las rutas API desconocidas podían responder con la página HTML general. | Se añadió una respuesta JSON 404 específica para `/api`. |
| Media | La gestión de usuarios permitía contraseñas débiles y valores de rol/estado no validados en servidor. | Se endurecieron las validaciones, se evita que el administrador actual se bloquee a sí mismo y se impide retirar al último administrador activo. |
| Media | Las rutas relativas de SQLite dependían del directorio desde el que se iniciaba Node.js. | Las rutas relativas se resuelven desde la raíz del proyecto. |
| Media | La prueba automatizada no verificaba explícitamente la integridad general y las claves foráneas. | Se añadieron `PRAGMA integrity_check` y `PRAGMA foreign_key_check` a `test:sqlite`. |

## 3. Correcciones funcionales solicitadas (segunda revisión)

| Módulo | Hallazgo | Corrección aplicada |
|---|---|---|
| Panel / tickets | La consulta de resumen devolvía `pendingTickets`, mientras la interfaz leía `ticketsOpen`; por eso se mostraba `—`. | El backend expone ambos nombres por compatibilidad y la interfaz usa `ticketsOpen` con fallback a `pendingTickets`. El cálculo cuenta estados distintos de `RESOLVED` y `CLOSED`. |
| Cuenta de cliente / beneficios | El panel CLIENT no consultaba las asignaciones de beneficios del cliente autenticado. | Se añadió `GET /api/my/benefits`, limitado a la ficha vinculada a la sesión CLIENT. El panel muestra beneficios disponibles/canjeados, descripción, código, nivel y vigencia. El estado vacío explica que aún no hay asignaciones. |
| Clientes / Nivel VIP | Los cambios manuales dependían de `prompt()`. | Se reemplazó por un modal con selección Silver/Gold/Platinum y campo de motivo. |
| Clientes / Automático | La reactivación dependía de `confirm()`. | Se implementó un modal de confirmación explícita antes de reactivar el cálculo automático. |
| Clientes / Puntos ± | El ajuste de puntos y su motivo se capturaban con dos ventanas nativas. | Se implementó un modal con campos de ajuste y motivo. |
| Campañas / Asignar beneficios | La asignación dependía de una confirmación nativa y no permitía filtrar nivel desde la interfaz. | Se implementó un modal que permite seleccionar todos los niveles o Silver, Gold o Platinum y confirma el número de asignaciones creadas. |
| Atención / Editar y Estado | No había un flujo visual de edición para tickets; el estado se cambiaba con `prompt()`. | Se incorporó modal de edición y modal de estado con catálogo de estados. El backend valida los estados permitidos y registra los cambios de estado en `ticket_history`. |
| Reservas / Editar y Estado | La edición no estaba conectada al endpoint PATCH; el estado se modificaba con `prompt()`. | Se conectó el modal de edición a PATCH y se implementó selector de estado. El backend valida fechas, duración, aforo de personas y conflictos de horario al editar. |
| Eventos / Inscribir | La inscripción usaba `prompt()` y solo pedía nombre. | Se implementó modal con nombre y correo del asistente. |
| Usuarios / Editar y Editar rol | El cambio de rol se hacía con `prompt()` y estaba mezclado con la acción de edición. | Se separaron las acciones Editar y Editar rol, cada una con su modal y validación de servidor. |

Los modales nuevos comparten estructura visual, etiquetas, acciones Cancelar/Guardar, cierre y bloqueo del botón durante el envío. Se añadieron estilos para las tarjetas de beneficios del cliente.

## 4. Mejoras de distribución

- Se mantiene `backend/.env.example` como plantilla sin secretos.
- `backend/.env` se crea localmente mediante `instalar.bat` o `backend/scripts/setup.js`.
- El archivo `database/atlantic_crm.db` se crea en la primera ejecución.
- La carga de datos demo sigue siendo opcional y exige `SEED_DEMO_DATA=true`; está bloqueada cuando `NODE_ENV=production`.
- Se reforzó `.gitignore` para excluir secretos, bases de datos, archivos WAL/SHM, dependencias e historial.
- Se añadió el comando `npm test` para ejecutar comprobaciones de sintaxis y pruebas SQLite.
- La documentación de instalación y mantenimiento se actualizó para describir el paquete limpio.

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm run check` | Aprobada |
| `npm run test:sqlite` | Aprobada |
| `PRAGMA integrity_check` | `ok` |
| `PRAGMA foreign_key_check` | Sin incidencias |
| Inicialización de esquema en base temporal | Aprobada |
| Reglas Silver, Gold y Platinum | Aprobadas |
| Consultas parametrizadas, TOP y transacciones | Aprobadas |
| Conteo de tickets abiertos con estados activos | Aprobado en prueba SQLite |
| Consulta relacional de beneficios asignados por cliente | Aprobada en prueba SQLite |
| Registro relacional de historial de estado de tickets | Aprobado en prueba SQLite |
| Sintaxis de frontend y backend tras los cambios | Aprobada |
| Inicio HTTP y `/api/health` | Aprobado |
| Registro con contraseña inferior a 12 caracteres | Rechazado con HTTP 400 |
| Actualización de ticket por CLIENT | Rechazada con HTTP 403 |
| Estado de reserva inválido | Rechazado con HTTP 400 |
| Payload POS con importe negativo y clave de integración de prueba | Rechazado con HTTP 400 |
| Ruta API inexistente | HTTP 404 en JSON |
| Cabecera `Cache-Control: no-store` | Verificada |

Las pruebas se ejecutaron en una base temporal, separada de los datos del usuario. El endpoint POS requiere una prueba con la credencial de integración configurada en el entorno receptor.

## 6. Recomendaciones pendientes para producción

Estas actividades dependen del entorno, infraestructura o decisiones operativas y no se pueden certificar únicamente con el ZIP:

1. Configurar HTTPS y un proxy inverso si el CRM se publica fuera del equipo local.
2. Definir quién administra y custodia `backend/.env`; usar secretos propios del entorno productivo.
3. Configurar respaldos automáticos, cifrado de los respaldos y pruebas de restauración.
4. Validar la integración POS con el proveedor real, sus reglas de reintento, autenticación, idempotencia y moneda.
5. Ejecutar pruebas funcionales con usuarios de cada rol y datos reales controlados.
6. Definir política de conservación, acceso y eliminación de datos personales.
7. Supervisar dependencias y ejecutar auditoría de vulnerabilidades en el entorno con acceso a registro npm.
8. Revisar la capacidad esperada. SQLite es apropiado para una instancia de aplicación y carga moderada; para múltiples instancias o alta concurrencia de escritura debe evaluarse otra arquitectura.

## 7. Limitaciones de la revisión

La revisión automatizada confirma sintaxis, inicialización, integridad relacional, conteo de tickets, consulta de beneficios y varios flujos HTTP heredados de la auditoría anterior. No equivale a una certificación de seguridad, una prueba de penetración, una auditoría legal de privacidad ni una validación de integraciones con servicios de terceros. En esta segunda revisión no fue posible repetir el flujo HTTP completo ni una prueba visual real en navegador porque la instalación de dependencias npm no pudo completarse en el entorno de trabajo. Los cambios de backend se validaron por sintaxis y con consultas SQLite aisladas; los cambios de interfaz, por sintaxis JavaScript. Antes de producción debe completarse la matriz manual en navegador.

## 8. Procedimiento de instalación de la versión limpia

1. Descomprimir el ZIP final.
2. Ejecutar `instalar.bat` en Windows.
3. Ejecutar `iniciar.bat`.
4. Abrir `http://localhost:3000`.
5. Crear el primer administrador.
6. Si se requiere información de demostración, detener el servicio y ejecutar la carga demo siguiendo la guía; no hacerlo en producción.
7. Ejecutar `npm test` para repetir las pruebas locales.


**Datos originales:** el archivo `CRM-ATLANTIC-CITY-DATOS-ORIGINALES.db` se entrega aparte como copia de respaldo de la base recibida. No lo coloques en una carpeta compartida ni lo publiques; contiene las cuentas y registros de la base que adjuntaste. Para usarlo, detén el CRM y reemplaza `database/atlantic_crm.db` en tu instalación, conservando una copia previa. La aplicación crea una base vacía automáticamente si no se restaura este respaldo.
