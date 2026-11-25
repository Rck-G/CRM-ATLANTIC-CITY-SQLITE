# Pruebas — SQLite Edition

## Pruebas automatizadas

Ejecuta:

```bash
npm run check
npm run test:sqlite
```

La prueba SQLite comprueba inicialización del esquema, valores iniciales Silver/Gold/Platinum, consultas parametrizadas, compatibilidad con `TOP` y transacciones.

## Pruebas funcionales recomendadas

1. Crear el primer administrador e iniciar sesión.
2. Registrar un cliente y comprobar que inicia en Silver.
3. Ajustar puntos y comprobar el ascenso automático.
4. Asignar un nivel manual y comprobar que el recálculo lo respeta.
5. Cambiar reglas y umbrales desde Fidelización.
6. Registrar una venta POS pagada y verificar la acreditación de puntos.
7. Reenviar el mismo identificador de venta y comprobar que no se duplican puntos.
8. Crear y gestionar campañas, beneficios, restaurantes, reservas, eventos y tickets.

## Prueba HTTP ejecutada durante la preparación

Se comprobó el inicio del servidor, health check SQLite, alta inicial de administrador, login, registro de cliente, ajuste de puntos, asignación manual de nivel, actualización de reglas, registro POS y resumen analítico.
