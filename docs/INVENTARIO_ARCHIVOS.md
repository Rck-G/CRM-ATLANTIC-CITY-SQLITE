# Inventario de archivos del proyecto

Este inventario describe los archivos incluidos en la distribución y su función. Los archivos locales generados durante la instalación se indican por separado.

## 1. Raíz del proyecto

| Archivo | Función |
|---|---|
| `README.md` | Introducción, requisitos, instalación rápida, módulos y enlaces a la documentación |
| `package.json` | Metadatos, dependencias y comandos npm del proyecto |
| `package-lock.json` | Versiones concretas de dependencias para instalaciones reproducibles |
| `instalar.bat` | Valida el entorno, prepara configuración local e instala dependencias en Windows |
| `iniciar.bat` | Inicia el servidor desde Windows |
| `Guia_Instalacion_CRM_Atlantic_City.txt` | Guía breve de instalación, acceso y datos de demostración |
| `Documentacion_CRM_Atlantic_City_SQLITE.docx` | Documento formal de descripción funcional y técnica |
| `Presentacion_CRM_Atlantic_City_SQLITE.pptx` | Presentación ejecutiva del sistema |

## 2. Interfaz web

| Archivo | Función |
|---|---|
| `frontend/index.html` | Documento principal y punto de entrada de la interfaz |
| `frontend/css/styles.css` | Estilos, componentes visuales, disposición y adaptación de pantalla |
| `frontend/js/app.js` | Navegación, interacción de formularios, estado de interfaz y comunicación con la API |

## 3. Backend

| Archivo | Función |
|---|---|
| `backend/package.json` | Metadatos y dependencias del backend |
| `backend/package-lock.json` | Bloqueo de versiones de dependencias del backend |
| `backend/.env.example` | Plantilla de variables de entorno; no contiene secretos válidos de producción |
| `backend/src/app.js` | Servidor Express, endpoints, autenticación, autorización, validación y lógica funcional |
| `backend/src/db.js` | Inicialización del archivo de datos, ejecución de consultas, compatibilidad de consultas y transacciones |
| `backend/database/sqlite-schema.sql` | Definición de tablas, columnas, restricciones y relaciones |

## 4. Scripts de backend

| Archivo | Función |
|---|---|
| `backend/scripts/setup.js` | Genera `backend/.env` y secretos aleatorios cuando el archivo aún no existe |
| `backend/scripts/seed-demo.js` | Carga registros de demostración cuando se habilita explícitamente el modo demo |
| `backend/scripts/test-sqlite.js` | Ejecuta comprobaciones automatizadas del esquema, consultas y transacciones |

## 5. Documentación técnica

| Archivo | Función |
|---|---|
| `docs/INSTALACION.md` | Requisitos, instalación, primer acceso y diagnóstico |
| `docs/MANUAL_USUARIO.md` | Uso de módulos, roles y principales flujos |
| `docs/ARQUITECTURA.md` | Capas, componentes y flujo de solicitudes |
| `docs/BASE_DATOS.md` | Persistencia, dominios y criterios de integridad |
| `docs/PRUEBAS.md` | Comandos, matriz funcional y criterios de aceptación |
| `docs/CONFIGURACION_Y_CICLO_DE_VIDA.md` | Variables, inicio, detención y dependencias |
| `docs/OPERACION_Y_MANTENIMIENTO.md` | Respaldo, restauración, seguridad y solución de problemas |
| `docs/INVENTARIO_ARCHIVOS.md` | Catálogo y explicación de los archivos de la distribución |
| `docs/REVISION_TECNICA_Y_MEJORAS.md` | Hallazgos, correcciones aplicadas, pruebas y recomendaciones de producción |

## 6. Carpeta de datos

| Archivo | Función |
|---|---|
| `database/.gitkeep` | Mantiene la carpeta de datos en el paquete aunque el archivo de base todavía no exista |

El archivo `database/atlantic_crm.db` se crea durante la primera ejecución. No se incluye una base con información real en el paquete de distribución.

## 7. Material complementario y de consulta

| Archivo | Función |
|---|---|
| `legacy/documentacion-original/Documentacion_CRM_Atlantic_City.docx` | Documento de consulta del material de referencia original |
| `legacy/documentacion-original/Normalizacion_CRM_Atlantic_City.xlsx` | Hoja de consulta del análisis de normalización |
| `legacy/documentacion-original/CRM_Atlantic_City.pptx` | Presentación de referencia anterior |
| `legacy/sqlserver/README.md` | Nota de contexto de los scripts de referencia almacenados en esta carpeta |
| `legacy/sqlserver/schema.sql` | Archivo de definición de referencia |
| `legacy/sqlserver/CRM_Atlantic_City_schema.sql` | Esquema de referencia complementario |
| `legacy/sqlserver/migrations/20261123_user_phone.sql` | Script de referencia de cambios de estructura |
| `legacy/sqlserver/migrations/20261125_loyalty_points.sql` | Script de referencia relacionado con fidelización |

El material de consulta se conserva separado de los componentes que se ejecutan en el flujo normal de la aplicación. No es necesario abrir ni ejecutar estos archivos para instalar o iniciar el CRM.

## 8. Archivos generados en la instalación

| Archivo o carpeta | Generación | Tratamiento |
|---|---|---|
| `backend/.env` | `instalar.bat` o `backend/scripts/setup.js` | Privado; contiene secretos y configuración local |
| `database/atlantic_crm.db` | Inicialización del backend | Datos de la aplicación; respaldar periódicamente |
| `database/atlantic_crm.db-shm` y `database/atlantic_crm.db-wal` | SQLite cuando utiliza el modo WAL | Archivos auxiliares; no borrar mientras el servicio esté activo |
| `node_modules/` | `npm install` | Dependencias instaladas; se puede reconstruir desde los archivos npm |

## 9. Archivos excluidos del control de versiones

`.gitignore` excluye dependencias instaladas, configuración privada, bases de datos y archivos auxiliares, además de archivos temporales habituales. Esta exclusión evita publicar secretos o datos operativos por accidente.
