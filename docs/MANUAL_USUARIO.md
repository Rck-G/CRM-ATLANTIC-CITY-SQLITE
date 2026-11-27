# Manual de usuario

## 1. Acceso al sistema

Abra `http://localhost:3000` desde el equipo donde se ejecuta el CRM o desde un dispositivo autorizado en la red configurada.

### Primer administrador

Si el sistema todavía no tiene un administrador, aparecerá la opción de configuración inicial. Registre nombre, correo y contraseña segura de al menos 12 caracteres. Esta opción se cierra después de crear el primer administrador.

### Inicio de sesión

Ingrese correo y contraseña. La duración predeterminada de la sesión es de ocho horas y puede ajustarse con `JWT_EXPIRES_IN`. Al cerrar sesión, la interfaz elimina el token almacenado en el navegador.

## 2. Roles

| Rol | Uso general |
|---|---|
| ADMIN | Configuración y administración general |
| EMPLOYEE | Operación y atención autorizada |
| MARKETING | Campañas y beneficios autorizados |
| CLIENT | Consulta de perfil y servicios propios habilitados |

Los permisos efectivos dependen de las validaciones del backend.

## 3. Clientes

El registro de cliente solicita los datos de identificación y contacto definidos por el formulario. El sistema valida campos obligatorios y evita duplicidades mediante restricciones de datos. El consentimiento de marketing debe registrar la decisión real de la persona.

Los clientes autenticados solo deben acceder a su propia información y a los tickets asociados que la aplicación les permita consultar.

## 4. Fidelización

Los niveles iniciales son Silver (0), Gold (500) y Platinum (1.500 puntos). El módulo permite revisar la puntuación y administrar las reglas habilitadas para el rol. Cuando se registra una venta elegible, la aplicación procesa la operación según la regla activa y conserva la referencia de la venta para evitar duplicaciones.

Los ajustes manuales deben incluir un motivo. Si se habilita una asignación manual de nivel, el comportamiento de recálculo automático respeta esa configuración hasta que se reactive el cálculo automático.

## 5. Campañas y beneficios

El módulo de campañas permite administrar campañas, su estado, público objetivo y canal. Los beneficios pueden vincularse a una campaña, definir vigencia, nivel elegible y límites de redención. Revise fechas, estado y disponibilidad antes de publicar una promoción.

## 6. Restaurantes y reservas

Las reservas registran restaurante, datos del invitado, cantidad de personas e intervalo horario. La API valida la información y comprueba solapamientos para el restaurante dentro de una transacción. Verifique fecha, hora y capacidad antes de confirmar.

## 7. Eventos e inscripciones

Los eventos contienen datos descriptivos, sede, fechas, capacidad y estado. Las inscripciones se relacionan con el evento y, cuando corresponde, con un cliente. Controle el aforo y el estado de publicación.

## 8. Tickets y atención

Los tickets permiten registrar solicitudes, categoría, canal, prioridad, estado, responsable y resolución. El historial conserva los cambios de estado y las notas de seguimiento.

## 9. Ventas e integraciones

La recepción de ventas POS requiere una clave configurada en `INTEGRATION_WEBHOOK_SECRET` y enviada en la cabecera `x-integration-secret`. No incluya esta clave en correos, capturas, manuales públicos ni código del navegador. Las integraciones externas no deben considerarse activas hasta que se configuren y prueben expresamente.

## 10. Perfil y preferencias

Desde el menú de usuario, abra “Mi perfil” para consultar o actualizar los datos personales habilitados. El rol, los permisos y el estado de la cuenta no se modifican desde el perfil. Si está disponible el cambio de contraseña, introduzca la contraseña actual y confirme la nueva según las validaciones del formulario.

## 11. Tema visual

El control de tema permite alternar entre presentación clara y oscura. La preferencia se conserva en el navegador utilizado.


## 12. Selección de clientes para beneficios

En las acciones **Asignar** y **Canjear** del módulo de beneficios, el CRM muestra un selector visual. Escriba parte del nombre, documento o correo en el buscador y seleccione al cliente correcto. La interfaz muestra el nombre y datos de referencia; el identificador interno se utiliza automáticamente en segundo plano y no necesita copiarse.
