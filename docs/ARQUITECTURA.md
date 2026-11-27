# Arquitectura de la solución

## 1. Visión general

La solución utiliza una arquitectura web cliente-servidor organizada en tres capas:

1. **Presentación:** interfaz web implementada con HTML, CSS y JavaScript.
2. **Aplicación:** API REST sobre Node.js y Express; concentra autenticación, autorización, validación y reglas de negocio.
3. **Persistencia:** base relacional local administrada mediante el módulo integrado `node:sqlite`.

El navegador consume la API HTTP. El backend valida las solicitudes y realiza las operaciones de datos; el cliente no accede directamente al archivo de base de datos.

## 2. Componentes

| Componente | Archivo o carpeta | Función |
|---|---|---|
| Entrada web | `frontend/index.html` | Estructura de la aplicación |
| Estilos | `frontend/css/styles.css` | Diseño visual y adaptación de pantalla |
| Lógica de interfaz | `frontend/js/app.js` | Navegación, formularios y llamadas a la API |
| Servidor | `backend/src/app.js` | Rutas, middleware y reglas de negocio |
| Acceso a datos | `backend/src/db.js` | Apertura de la base, consultas y transacciones |
| Esquema | `backend/database/sqlite-schema.sql` | Definición de tablas, relaciones e índices |
| Configuración | `backend/.env` | Variables locales y secretos |
| Recursos estáticos | Servidos por el backend | Entrega de la interfaz web |

## 3. Flujo de una solicitud

1. El usuario realiza una acción en la interfaz.
2. JavaScript envía una petición HTTP a la API.
3. El backend valida los datos recibidos.
4. Las rutas protegidas verifican el token de sesión y el estado del usuario.
5. El middleware de roles aplica las restricciones de acceso.
6. El módulo de datos ejecuta consultas parametrizadas y, cuando corresponde, transacciones.
7. La API devuelve una respuesta JSON.
8. La interfaz presenta el resultado o el mensaje de error.

## 4. Seguridad de aplicación

El backend incorpora cabeceras de seguridad, control de origen configurable, límite de tamaño para JSON, limitación de intentos en rutas sensibles, contraseñas protegidas mediante hash, tokens JWT y autorización por roles. La integración POS exige una clave compartida configurada en el entorno.

Estas medidas deben complementarse con controles del sistema operativo, protección de secretos, copias de seguridad y una configuración de red adecuada.

## 5. Persistencia

La ubicación predeterminada del archivo de datos es `database/atlantic_crm.db`. La ruta puede configurarse mediante `SQLITE_FILE` en `backend/.env`. La inicialización del esquema se realiza desde el módulo de acceso a datos.

## 6. Consideraciones de capacidad

SQLite almacena los datos en un archivo local y resulta adecuado para una instalación con un único servidor de aplicación y una carga de escritura moderada. No se debe compartir el archivo mediante una carpeta de red entre varias instancias de aplicación. Si el escenario requiere múltiples servidores de aplicación o alta concurrencia de escritura, debe evaluarse una arquitectura de base de datos cliente-servidor.
