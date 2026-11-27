# Operación, mantenimiento y continuidad

## 1. Operación diaria

1. Inicie el CRM desde `iniciar.bat` o `npm start`.
2. Compruebe `/api/health`.
3. Mantenga activa la terminal o el proceso del servidor.
4. Cierre sesión al terminar de utilizar una cuenta.
5. Revise errores del proceso y eventos de auditoría cuando corresponda.

## 2. Copias de seguridad

La base de datos predeterminada se encuentra en `database/atlantic_crm.db`.

Procedimiento sencillo para una instalación local:

1. Avise a los usuarios que el sistema estará temporalmente fuera de servicio.
2. Detenga el backend con `Ctrl+C`.
3. Copie el archivo `.db` a una ubicación segura distinta del equipo o carpeta de trabajo.
4. Incluya en el respaldo la configuración `backend/.env` mediante un canal seguro; contiene secretos.
5. Registre fecha, responsable y ubicación del respaldo.
6. Reinicie el sistema y compruebe `/api/health`.

No envíe respaldos ni secretos por canales públicos. Defina una frecuencia según el volumen y la importancia de los datos.

## 3. Restauración

1. Detenga la aplicación.
2. Conserve una copia del archivo actual antes de reemplazarlo.
3. Copie el respaldo validado a la ruta indicada por `SQLITE_FILE`.
4. Verifique permisos de lectura y escritura.
5. Inicie el CRM.
6. Compruebe `/api/health`, inicio de sesión y consulta de registros.
7. Registre la restauración y el respaldo utilizado.

La restauración reemplaza los datos existentes en el archivo destino; confirme la ruta antes de copiar.

## 4. Seguridad

- Mantenga Node.js y las dependencias actualizados.
- Limite el acceso al equipo y a la carpeta de datos.
- Use contraseñas únicas y robustas.
- No comparta tokens ni secretos de integración.
- No utilice cuentas demo en entornos reales.
- Mantenga la aplicación detrás de controles de red adecuados.
- Aplique el principio de mínimo privilegio a los usuarios del sistema operativo.

## 5. Solución de problemas

| Síntoma | Comprobación |
|---|---|
| `node` no se reconoce | Instale Node.js 22.13+ y abra una terminal nueva |
| El instalador falla | Compruebe conexión a internet, permisos y salida de npm |
| El puerto está ocupado | Cambie `PORT` y los orígenes relacionados o libere el puerto |
| No existe `backend/.env` | Ejecute `instalar.bat` o `node backend/scripts/setup.js` |
| La API no responde | Revise la terminal y consulte `/api/health` |
| Error al abrir el archivo de datos | Compruebe `SQLITE_FILE` y permisos de carpeta |
| No puede iniciar sesión | Verifique correo, contraseña, estado de cuenta y vigencia de sesión |
| La integración POS rechaza la petición | Revise la cabecera `x-integration-secret` y el secreto configurado |

## 6. Actualizaciones

Antes de actualizar:

1. Detenga el backend.
2. Respalde la base de datos y la configuración.
3. Conserve una copia de la versión anterior.
4. Aplique los cambios de archivos y dependencias.
5. Ejecute las pruebas automatizadas.
6. Inicie el sistema y realice una verificación funcional.
7. Conserve el respaldo hasta confirmar la estabilidad de la versión.

## 7. Continuidad operativa

Mantenga documentados el responsable técnico, la ubicación de los respaldos, la periodicidad, los permisos de acceso y el procedimiento de recuperación. La prueba periódica de restauración es necesaria para comprobar que las copias son utilizables.
