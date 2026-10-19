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

## Fase 3: búsqueda conversacional y cercanía

### Qué cambió

- **`/chat` ahora es un chat de búsqueda.** El cliente escribe, por ejemplo, "busco huevos baratos" o "leche cerca de mí", y recibe la respuesta del asistente en español con tarjetas de resultados: producto, tienda y barrio, distancia aproximada, precio con descuento, precio original tachado, porcentaje y vencimiento (en rojo si vence hoy o mañana). Hay sugerencias rápidas para empezar.
- **Ubicación.**
  - Con "Usar mi ubicación", el navegador pide permiso solo en ese momento. La posición se guarda únicamente en memoria de la pestaña (nunca en `localStorage`) y se puede dejar de usar.
  - Como alternativa, el cliente elige su barrio en un selector.
  - Los errores de permiso se explican en español.
- **El combo con presupuesto** pasa a un componente aparte al lado del chat, con selector de barrio.
- **Panel de la tienda: "Ubicación de la tienda".** Tiene campos de latitud y longitud, el botón "Usar mi ubicación actual" (si el tendero está en la tienda), un enlace "Ver en el mapa" (OpenStreetMap, se abre solo si el usuario hace clic) y validación de que lleguen las dos coordenadas o ninguna.

### Requiere

El backend de `desarrollo` (endpoints `/api/assistant/search`, `/api/stores/neighborhoods` y `/api/stores/me`).

### Variables nuevas

Ninguna.

### Cómo probarlo

Con el backend y el seed en local:
1. Abre `/chat`, pulsa "busco huevos baratos" y luego "Usar mi ubicación" para preguntar "leche cerca de mí".
2. En `/admin`, con una tienda, guarda coordenadas. Unas invertidas deben mostrar el aviso de que quedan fuera de Colombia.

## Fase 4: alertas y notificaciones

### Qué cambió

- **Registro.** Selector "Soy cliente" / "Tengo una tienda". Los campos de tienda solo aparecen si se elige tienda, y `/register?tipo=tienda` abre directamente esa opción.
- **Sesión del cliente.** Al entrar, el cliente va a `/alertas`. El header muestra "Mis alertas" y una campana con el contador de no leídas, que se actualiza cada minuto y no consulta mientras la pestaña está oculta.
- **`/alertas`** (solo clientes):
  - Crea alertas por producto o categoría, en cualquier barrio, en un barrio concreto o cerca de donde estás (radio de 1, 2, 5 o 10 km), con descuento mínimo.
  - Para la opción por cercanía hay que tomar la ubicación y marcar la casilla de consentimiento; sin ella no se envía la posición.
  - Lista las alertas activas y permite eliminarlas.
- **`/notificaciones`** (solo clientes): bandeja con los avisos (los no leídos resaltados), marcar como leída y marcar todas.

### Requiere

El backend de `desarrollo` con las migraciones `004` y `005`.

### Variables nuevas

Ninguna.

### Cómo probarlo

Con el seed:
1. Entra como `tienda.donaluz@stockbarrio.test` y aprueba "Leche entera 1 L".
2. Sal y entra como `cliente.demo@stockbarrio.test` (contraseña `tienda12345`): la campana debe mostrar 1 y la bandeja el aviso.
