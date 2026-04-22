# Cotizador de seguros

Mini sistema web responsive para cargar cotizaciones, guardarlas en historial local y generar un PDF listo para enviar al cliente.

## Qué incluye

- Formulario por secciones: productor, cliente, detalle del seguro, coberturas y observaciones.
- Vista previa en vivo con estética inspirada en el mock compartido.
- Historial simple en `localStorage` para reabrir y duplicar cotizaciones.
- Descarga de PDF real en el navegador, sin dependencias externas.
- Opción de impresión para papel o “Guardar como PDF”.

## Cómo usarlo

```bash
npm start
```

Después abrí [http://localhost:4173](http://localhost:4173).

## Tests

```bash
npm test
```

## Notas

- No necesita backend para esta v1.
- Los datos quedan guardados en el navegador del dispositivo donde se use.
- Si más adelante querés multiusuario o sincronización, ahí sí conviene agregar backend y login.
# cotizador-pe
