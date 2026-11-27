# Plan de pruebas y verificación

## 1. Objetivo

Comprobar que la aplicación inicia, que el esquema de datos se encuentra disponible y que los principales flujos del CRM responden correctamente.

## 2. Pruebas automatizadas

Desde la carpeta raíz:

```bash
npm run check
npm run test:sqlite
```

La prueba de datos ejecuta una base temporal y verifica la inicialización del esquema, niveles iniciales de fidelización, consultas parametrizadas, compatibilidad de consultas utilizadas por el backend, transacciones, conteo de tickets abiertos y recuperación de beneficios asignados a una ficha de cliente. La base temporal se elimina al finalizar.

## 3. Prueba de disponibilidad HTTP

1. Inicie la aplicación con `npm start`.
2. Abra `http://localhost:3000/api/health`.
3. Compruebe que la respuesta sea satisfactoria y que informe `ok: true`.
4. Confirme que el motor reportado sea SQLite.
5. Compruebe que la página principal se sirve desde `http://localhost:3000`.

## 4. Matriz de pruebas funcionales

| ID | Caso | Resultado esperado |
|---|---|---|
| TC-01 | Configurar el primer administrador | Cuenta creada una sola vez |
| TC-02 | Iniciar sesión con credenciales válidas | Sesión autorizada |
| TC-03 | Iniciar sesión con credenciales incorrectas | Acceso rechazado |
| TC-04 | Registrar cliente | Cliente y cuenta relacionados |
| TC-05 | Consultar perfil | Solo datos permitidos para la sesión |
| TC-06 | Ajustar puntos | Movimiento y puntuación consistentes |
| TC-07 | Cambiar nivel de fidelización | Nivel acorde con regla o asignación autorizada |
| TC-08 | Registrar venta elegible | Acreditación según regla activa |
| TC-09 | Reenviar una venta con el mismo identificador | No duplica la acreditación |
| TC-10 | Crear campaña y beneficio | Registros disponibles según estado y vigencia |
| TC-11 | Registrar reserva | Intervalo y restaurante validados |
| TC-12 | Crear evento e inscripción | Aforo y relación de inscripción controlados |
| TC-13 | Crear y actualizar ticket | Historial de cambios disponible |
| TC-14 | Acceder a una ruta sin permiso | Respuesta de acceso denegado |
| TC-15 | Consultar auditoría | Operaciones trazables según rol |
| TC-16 | Abrir panel con cuenta demo CLIENT | Se muestran los beneficios asignados a esa ficha, con estado, código y vigencia |
| TC-17 | Abrir panel administrativo con tickets demo | El indicador de tickets abiertos cuenta NEW, PENDING, IN_PROGRESS y WAITING_INFO |
| TC-18 | Editar ticket y cambiar estado | Modal visual, estados válidos y actualización persistida |
| TC-19 | Editar reserva y cambiar estado | Modal visual, fechas válidas y sin solapamiento de restaurante |
| TC-20 | Inscribir asistente en evento | Modal solicita nombre y correo; servidor verifica publicación y aforo |
| TC-21 | Editar usuario y rol | Acciones separadas y permisos validados por el backend |

## 5. Criterios de aceptación

- La aplicación inicia sin errores críticos.
- El endpoint de salud responde correctamente.
- Las pruebas automatizadas terminan con código de salida cero.
- Los flujos críticos respetan autenticación, roles e integridad de datos.
- Las operaciones repetidas que requieren idempotencia no generan duplicados.
- Los errores se presentan sin exponer secretos ni detalles internos innecesarios.

## 6. Registro de resultados

Para una presentación formal, registre fecha, versión del proyecto, responsable, entorno, resultado de cada caso y evidencia. No marque un caso como aprobado sin haberlo ejecutado en el entorno que se está evaluando.
