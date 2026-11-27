# Instalación y puesta en marcha

## 1. Requisitos previos

- Windows 10/11 para utilizar los instaladores `.bat`.
- Node.js 22.13 o superior y npm.
- Navegador moderno.
- Acceso de escritura a la carpeta del proyecto.

Compruebe las versiones:

```bash
node --version
npm --version
```

La versión de Node.js debe ser igual o superior a `22.13.0`.

## 2. Instalación en Windows

1. Descomprima el proyecto en una carpeta local.
2. Ejecute `instalar.bat`.
3. El proceso valida Node.js, crea `backend/.env` si todavía no existe e instala las dependencias.
4. Cuando termine, ejecute `iniciar.bat`.
5. Abra `http://localhost:3000`.
6. Cree el primer administrador desde la pantalla de configuración inicial.

No cierre la ventana de terminal mientras utilice el CRM.

## 3. Instalación manual

En la carpeta raíz:

```bash
npm install
node backend/scripts/setup.js
npm start
```

`setup.js` genera `backend/.env` únicamente cuando no existe; si ya existe, conserva la configuración.

## 4. Primer acceso

La primera vez, la aplicación permite crear un administrador si aún no hay una cuenta con rol `ADMIN`. Se exige un correo válido y una contraseña de 12 a 200 caracteres. Una vez completada la configuración inicial, el endpoint de alta inicial deja de estar disponible.

## 5. Verificación

Abra:

```text
http://localhost:3000/api/health
```

La respuesta esperada contiene `ok: true` y `engine: "SQLite"`. Si el servicio no responde, confirme que el proceso Node.js sigue activo y que el puerto configurado está libre.

## 6. Datos de demostración

La carga demo es opcional. Solo para desarrollo:

PowerShell:
```powershell
$env:SEED_DEMO_DATA="true"
npm run seed:demo
```

CMD:
```bat
set SEED_DEMO_DATA=true && npm run seed:demo
```

No ejecute la carga demo con datos reales. Las cuentas de demostración se encuentran en la guía de instalación de la raíz del proyecto.

## 7. Desinstalación o traslado

1. Detenga el proceso del CRM.
2. Realice una copia de seguridad del archivo de datos.
3. Conserve `backend/.env` si necesita mantener los mismos secretos y configuración.
4. Traslade la carpeta completa a la nueva ubicación.
5. Ejecute `npm install` si necesita reconstruir las dependencias.
6. Inicie el sistema y compruebe `/api/health`.

La base de datos se crea automáticamente al iniciar la aplicación si todavía no existe. El ZIP de distribución no incluye el archivo de datos local ni archivos WAL/SHM; si necesitas datos de muestra, ejecuta la carga demo de forma explícita en un entorno de pruebas.
