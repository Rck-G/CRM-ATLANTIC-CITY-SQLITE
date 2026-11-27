# CRM Atlantic City

**Sistema de gestión de relaciones con clientes, fidelización y experiencias.**

CRM Atlantic City centraliza la administración de clientes, usuarios, campañas, beneficios, puntos de fidelización, reservas, eventos, ventas, tickets e integraciones en una aplicación web.

## Contenido del proyecto

| Componente | Ubicación | Responsabilidad |
|---|---|---|
| Interfaz web | `frontend/` | Pantallas, estilos y comportamiento del usuario |
| API y lógica de negocio | `backend/src/` | Autenticación, permisos, validaciones y servicios |
| Persistencia | `backend/database/` y `database/` | Esquema y archivo local de datos |
| Automatización | `backend/scripts/` | Configuración, datos de demostración y pruebas |
| Documentación | `docs/` | Instalación, operación, arquitectura y referencia técnica |
| Material complementario | `legacy/documentacion-original/` y `legacy/sqlserver/` | Material de consulta que no se necesita para iniciar la aplicación |

## Requisitos

- Windows 10/11 para los archivos `.bat`; también es posible ejecutar los comandos manualmente en macOS o Linux.
- Node.js **22.13 o superior** y npm.
- Navegador web actualizado.
- Permisos de lectura y escritura en la carpeta del proyecto.

No se necesita instalar un servidor de base de datos independiente. La distribución no incluye secretos locales, datos operativos ni dependencias instaladas: se generan durante la instalación.

## Instalación rápida en Windows

1. Descomprima el ZIP en una carpeta local, por ejemplo `C:\Aplicaciones\CRM-Atlantic-City`.
2. Ejecute `instalar.bat`.
3. Espere a que se genere la configuración local y se instalen las dependencias.
4. Ejecute `iniciar.bat`.
5. Abra [http://localhost:3000](http://localhost:3000).
6. En la pantalla inicial, cree el primer usuario administrador.

El instalador crea `backend/.env` con secretos aleatorios. No comparta ese archivo.

## Instalación manual

Desde la carpeta raíz del proyecto:

```bash
npm install
node backend/scripts/setup.js
npm start
```

Para comprobar la conexión de la aplicación:

```text
http://localhost:3000/api/health
```

La respuesta satisfactoria informa `ok: true` y `engine: SQLite`.

## Funcionalidades principales

- Gestión de clientes y perfiles.
- Usuarios, autenticación y permisos por rol.
- Fidelización con niveles Silver, Gold y Platinum.
- Puntos, reglas de acumulación e historial de actividad.
- Campañas, beneficios y asignaciones.
- Restaurantes y reservas con validación de horarios.
- Eventos e inscripciones con control de aforo.
- Tickets de atención e historial.
- Registro de auditoría.
- Recepción de ventas e integración POS mediante clave de integración.
- Paneles e indicadores operativos.

## Roles de acceso

- **ADMIN:** administración general y configuración.
- **EMPLOYEE:** tareas operativas autorizadas.
- **MARKETING:** actividades y herramientas de marketing autorizadas.
- **CLIENT:** consulta y gestión de la información propia habilitada.

El backend valida la sesión y los permisos; ocultar una opción en la interfaz no sustituye la validación del servidor.

## Fidelización

Los umbrales iniciales configurados son:

| Nivel | Puntos mínimos |
|---|---:|
| Silver | 0 |
| Gold | 500 |
| Platinum | 1.500 |

Las reglas y los umbrales se administran desde el módulo correspondiente, según los permisos disponibles.

## Estructura de documentación

- `docs/INSTALACION.md`: instalación y puesta en marcha.
- `docs/MANUAL_USUARIO.md`: flujos de uso y módulos.
- `docs/ARQUITECTURA.md`: componentes y flujo de la aplicación.
- `docs/BASE_DATOS.md`: estructura de persistencia y modelo relacional.
- `docs/PRUEBAS.md`: verificaciones y pruebas funcionales.
- `docs/CONFIGURACION_Y_CICLO_DE_VIDA.md`: configuración, inicio, cierre y despliegue.
- `docs/OPERACION_Y_MANTENIMIENTO.md`: respaldos, seguridad y solución de problemas.
- `docs/INVENTARIO_ARCHIVOS.md`: descripción de los archivos del proyecto.

También se incluyen `Documentacion_CRM_Atlantic_City_SQLITE.docx` y `Presentacion_CRM_Atlantic_City_SQLITE.pptx` en la carpeta raíz.

## Datos de demostración

La carga de datos de demostración es opcional y está destinada exclusivamente a desarrollo o presentaciones controladas.

En PowerShell:

```powershell
$env:SEED_DEMO_DATA="true"
npm run seed:demo
```

En CMD:

```bat
set SEED_DEMO_DATA=true && npm run seed:demo
```

El script impide su ejecución cuando `NODE_ENV=production`. Las credenciales de demostración están documentadas en `Guia_Instalacion_CRM_Atlantic_City.txt`; cámbielas o no las utilice en un entorno real.

## Seguridad y cuidado de los datos

- Mantenga `backend/.env` privado.
- Utilice contraseñas robustas y únicas.
- No publique el puerto de la aplicación directamente en Internet sin una configuración de despliegue segura.
- Restrinja el acceso al equipo y a la carpeta que contiene la base de datos.
- Realice copias de seguridad periódicas y pruebe su restauración.
- No incluya la base de datos real ni secretos en repositorios o entregas públicas.
- Use los datos de demostración solo en entornos no productivos.

## Pruebas

Desde la carpeta raíz:

```bash
npm run check
npm run test:sqlite
```

Consulte `docs/PRUEBAS.md` para la matriz de comprobaciones funcionales y los criterios de aceptación.

## Soporte y operación

Para instalar, operar o mantener el sistema, siga el orden de la documentación de `docs/`. Antes de actualizar el proyecto, conserve una copia de seguridad de la base de datos y de `backend/.env`.


## Auditoría técnica

Consulte `docs/REVISION_TECNICA_Y_MEJORAS.md` para el resumen de hallazgos, correcciones aplicadas, pruebas realizadas y recomendaciones para el despliegue en producción.

> La distribución está limpia y no incorpora datos locales ni secretos. Si necesitas conservar los registros del ZIP revisado, usa la copia de base de datos entregada por separado y sigue las precauciones indicadas en `docs/REVISION_TECNICA_Y_MEJORAS.md`.
