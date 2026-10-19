# Cambios en la rama `desarrollo`

## Fase 2: IA de vencimientos y descuentos

### Qué cambió

- **Panel de la tienda: sección "Descuentos sugeridos".** Muestra cada sugerencia con:
  - días para vencer (en rojo si vence hoy o mañana);
  - razón;
  - descuento actual y sugerido;
  - precio nuevo y stock.

  Permite aprobar, rechazar o aprobar todas (con confirmación), y al aplicar un descuento la tabla del inventario se actualiza. Ningún descuento se aplica sin aprobación. Si el texto lo mejoró la IA, aparece la etiqueta "Texto mejorado con IA".
- **Asistente: combo.** Elegir productos es opcional; sin selección se usan los del barrio. Los campos tienen `name` y etiquetas accesibles.

### Requiere

El backend de la rama `desarrollo` (endpoints `/api/suggestions`).

### Variables nuevas

Ninguna.

### Cómo probarlo

1. Levanta el backend de `desarrollo` con `npm run seed` y `npm run dev`.
2. `npm start` aquí.
3. Entra con `mercado.elporvenir@stockbarrio.test` / `tienda12345` y aprueba una sugerencia en `/admin`.

Tests: `npx ng test --watch=false --browsers=ChromeHeadless`.
