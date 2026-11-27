# Configuración y ciclo de vida de la aplicación

## 1. Variables de entorno

La configuración local se almacena en `backend/.env`. El archivo de ejemplo es `backend/.env.example`.

| Variable | Uso | Valor de referencia |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `HOST` | Host previsto para el servicio | `127.0.0.1` |
| `SQLITE_FILE` | Ruta del archivo de datos | `./database/atlantic_crm.db` |
| `JWT_SECRET` | Firma de tokens | Secreto aleatorio de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |
| `FRONTEND_ORIGIN` | Origen permitido por CORS | `http://localhost:3000` |
| `INTEGRATION_WEBHOOK_SECRET` | Autorización de integración POS | Secreto aleatorio independiente |

El script `backend/scripts/setup.js` genera los secretos locales al crear el archivo por primera vez. Si el archivo ya existe, no lo sobrescribe.

## 2. Inicio y detención

- Windows: `iniciar.bat`.
- Manual: `npm start`.
- Para detener: use `Ctrl+C` en la terminal que ejecuta el servidor.

No apague el equipo ni cierre el proceso de forma forzada mientras haya operaciones en curso.

## 3. Puertos y acceso

El puerto predeterminado es 3000. Si se modifica `PORT`, actualice la dirección de acceso y los orígenes permitidos según el entorno. Para uso en red, configure expresamente el host, firewall, CORS y controles de acceso. No exponga el servicio directamente a Internet sin una revisión de seguridad y una capa de transporte cifrada.

## 4. Dependencias

Las dependencias de Node.js se declaran en `package.json` y se fijan en `package-lock.json`. Instale con `npm install`. No edite manualmente los archivos de bloqueo para resolver conflictos; actualice las dependencias mediante npm y pruebe la aplicación después del cambio.

## 5. Archivos generados localmente

- `backend/.env`: configuración y secretos privados.
- `database/atlantic_crm.db`: archivo de datos predeterminado.
- `node_modules/`: dependencias instaladas.

Estos archivos no deben publicarse en una entrega abierta. El control de versiones los excluye mediante `.gitignore`.
