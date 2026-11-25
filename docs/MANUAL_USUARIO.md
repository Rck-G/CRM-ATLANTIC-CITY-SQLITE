# Manual de usuario

## Primer administrador
En la pantalla de acceso, seleccione “Configurar primer administrador” cuando la API indique que no existe ADMIN. Use un correo válido y una contraseña de al menos 12 caracteres. Una vez creado, el alta inicial queda cerrada.

## Inicio de sesión y roles
Ingrese correo y contraseña. El token expira según `JWT_EXPIRES_IN` (por defecto 8 horas). Cerrar sesión elimina la sesión del navegador. El menú presenta los módulos permitidos para cada rol.

## Clientes y fidelización
Registre documento, nombres, correo y los datos solicitados. Cada cliente comienza en Silver salvo que un administrador cambie su categoría. Los niveles iniciales son Silver desde 0 puntos, Gold desde 500 y Platinum desde 1.500. Los umbrales y reglas de acumulación se pueden cambiar desde el módulo Fidelización.

Las ventas POS pagadas acreditan puntos según la regla activa para su origen. El identificador externo de la venta evita duplicar la acreditación. El administrador puede asignar manualmente un nivel, reactivar el cálculo automático y ajustar puntos con un motivo. Los cambios quedan registrados en el historial.

El consentimiento de marketing debe reflejar la autorización real del cliente. Los clientes solo pueden consultar sus propios datos y tickets.

## Reservas y eventos
Las reservas requieren restaurante, nombre, cantidad de personas e intervalo. La API valida el intervalo y comprueba solapamientos por restaurante dentro de una transacción. Los eventos publicados admiten inscripciones y control de aforo.

## Integraciones y ventas
No se ejecuta ninguna integración externa por defecto. El endpoint POS requiere `INTEGRATION_WEBHOOK_SECRET` y la cabecera `x-integration-secret`. No comparta esa clave.

## Perfil y datos personales
En la esquina superior derecha, seleccione el avatar. Desde “Mi perfil”, cada usuario autenticado puede consultar y actualizar sus propios datos. El rol, permisos y estado de la cuenta no se pueden modificar desde el perfil. Para cambiar la contraseña, ingrese la contraseña actual y escriba la nueva dos veces.

## Tema visual
El botón de tema alterna claro/oscuro; la preferencia se guarda en el navegador.
