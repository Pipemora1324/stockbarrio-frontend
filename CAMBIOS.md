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

## Fase 5: diseño, rendimiento y pulido

### Qué cambió

- **Estilos coherentes.** Tokens de color, tipografía del sistema y foco visible en `src/styles.scss`, usados en todos los componentes. El verde principal pasa a `#0e7f5b` y los grises de texto se oscurecen para cumplir el contraste AA.
- **Header.** En móvil tiene menú desplegable con botón accesible (`aria-expanded`), que se cierra al navegar o con Escape. Marca la página activa y, sin sesión, muestra "Crear cuenta" y "Entrar".
- **Tarjetas de producto compartidas.** Llevan ícono y color según la categoría (huevos, lácteos, panadería, frutas y verduras, carnes, granos, despensa…) o la imagen del producto con `loading="lazy"`. Muestran descuento, precio con descuento, precio anterior, días para vencer (en rojo si vence hoy o mañana) y stock.
- **Responsive real.**
  - Inicio, catálogo, chat, login, registro, alertas y bandeja se adaptan desde 360 px.
  - En el celular, la tabla del inventario pasa a tarjetas con etiquetas.
  - Probado sin desbordamiento horizontal a 360, 768 y 1280 px.
- **Rendimiento.**
  - Carga diferida de todas las páginas menos el inicio: el bundle inicial bajó de 375 kB a 323 kB.
  - `OnPush` en todos los componentes, `@for` con `track` y control de flujo nuevo en todas las plantillas.
- **Estados.** El inicio tiene carga, vacío (invita a registrar una tienda) y error con reintento.
- **Accesibilidad.**
  - Enlace "Saltar al contenido", etiquetas y `autocomplete` en los formularios.
  - `aria-label` en los botones de acción de cada producto.
  - Título de página por ruta.
- **Código en inglés.** El catálogo se renombró a `CatalogComponent` en `pages/catalog`; la URL sigue siendo `/catalogo`.
- **Corrección.** Al crear, editar o borrar un producto, las sugerencias de descuento del panel se actualizan; antes se podía ver la sugerencia de un producto ya borrado.
- **README** actualizado con páginas, privacidad, diseño y cómo probar.

### Variables nuevas

Ninguna. `vercel.json` no cambia.

## Resumen para pasar `desarrollo` a `main`

- **Requiere** el backend de `desarrollo` desplegado antes: `/api/suggestions`, `/api/assistant`, `/api/alerts`, `/api/notifications` y `/api/stores/me`.
- **Pruebas:** `npm run build` sin advertencias y 40 pruebas unitarias en verde con `npx ng test --watch=false --browsers=ChromeHeadless`. Además se hicieron recorridos completos en Chrome headless contra el backend local con el seed.

# Rama `mejoras`

## A) Validaciones

- `src/app/validation/rules.ts` replica las reglas de la API con los mismos mensajes en español.
- **Registro, formulario de producto, ubicación de la tienda, recuperar y restablecer contraseña, y perfil:**
  - error debajo de cada campo al salir de él, con `aria-invalid` y `aria-describedby`;
  - botón de envío deshabilitado mientras haya errores.
- El formulario de producto ahora es su propio componente:
  - la categoría es una lista desplegable;
  - el vencimiento no permite fechas pasadas al crear;
  - al editar se conserva una categoría vieja;
  - al abrirlo, la vista baja hasta él.
- El login se deshabilita mientras falten datos (no aplica las reglas nuevas, para no bloquear cuentas viejas).

## B) Botones, enlaces y ofertas

Revisé todos los enlaces y botones: no había `href="#"` ni botones sin acción. Esto es lo que cambió:

- **Nueva sección `/ofertas`:**
  - productos con descuento, con filtros por barrio, categoría, texto y "Cerca de mí" (con radio);
  - orden por mayor descuento, más cerca o vence primero;
  - los filtros quedan en la URL, nunca la ubicación.
- **Enlaces nuevos a Ofertas:** desde el menú principal, desde el inicio ("Ver ofertas de hoy", la tarjeta "Ofertas hoy" y "Ver todas las ofertas →"), desde el catálogo ("Ver solo ofertas →") y desde el chat.
- **Notificaciones:** cada una tiene "Ver la oferta", que abre `/ofertas` filtrado por el producto y la marca como leída.
- **Panel sin tienda:** ahora ofrece "Registrar una tienda" y "Cerrar sesión" en vez de solo texto.
- **Login:** nuevo enlace "¿Olvidaste tu contraseña?".
- **Header:** el nombre del usuario abre `/perfil`.

## C) Chat con IA

- **`/chat` es una conversación real:**
  - historial, del que se envían los últimos 6 turnos;
  - indicador "escribiendo…" y tarjetas con tienda, distancia, precio, descuento y vencimiento;
  - sugerencias rápidas ("pollo asado cerca", "ofertas de hoy", "huevos baratos", "leche por vencer");
  - botón "Nueva conversación" y contador de 500 caracteres.
- **Modo básico:** cuando la API responde con sus reglas locales, el mensaje lo dice.
- **Errores** (por ejemplo, el límite de mensajes): se muestran, pero no se reenvían como historial.

## D) Cuenta

- **Páginas nuevas:** `/forgot-password`, `/reset-password?token=…`, `/confirm-email?token=…` y `/perfil`, para cambiar nombre, contraseña (pide la actual) y correo (con verificación).
- **Sesión:** tras cambiar la contraseña la sesión sigue con el token nuevo. Tras restablecerla o cambiar el correo, se cierra y lleva al login con aviso.

## E) Pulido visual

- **Textos:** las palabras largas se parten, el interlineado de los párrafos es más cómodo y las celdas de tabla no desbordan.
- **Chat en el celular:** las sugerencias quedan en una fila desplazable y el placeholder ya no se corta.
- **Ubicación de la tienda en el celular:** los botones ocupan el ancho completo.
- **Comprobación:** recorrido automático en Chrome a 360, 768 y 1280 px por todas las páginas (con sesión de tienda y de cliente), sin desbordamiento horizontal.

## Variables nuevas

Ninguna en Vercel.

## Requiere

El backend de la rama `mejoras` (ofertas, chat, cuenta y categorías).

## Cómo probar

`npx ng test --watch=false --browsers=ChromeHeadless` (60 pruebas) y `npm run build`. Con el backend local y el seed:
1. Abre `/ofertas` y `/chat` y pulsa "pollo asado cerca".
2. En `/forgot-password` pide un enlace; sale en la consola del backend.
3. En `/perfil` cambia el nombre y la contraseña.

## Ajuste de IA para cupos gratuitos

- El chat entiende el nuevo `mode: "rules"` (respuesta por reglas a propósito). El aviso de "modo básico" solo aparece cuando la IA no estaba disponible o se agotó el límite personal.

## Alertas y notificaciones en pausa

- **Bandera nueva:** `enableAlerts` en `src/environments/environment.ts`, con valor por defecto `false`. Se puede cambiar al compilar con la variable `ENABLE_ALERTS` (script `scripts/set-env.mjs`, que corre antes de `npm run build`).
- **Con la bandera apagada:**
  - no se registran las rutas `/alertas` ni `/notificaciones`;
  - el header no muestra la campana ni "Mis alertas";
  - no se consulta el contador;
  - el cliente entra a `/ofertas`;
  - los textos de login y registro ya no mencionan alertas ni avisos.
- **Sin cambios de funcionamiento:** Ofertas, el chat y el panel de la tienda siguen igual. Revisé que no queden botones ni enlaces hacia lo oculto: los únicos enlaces a alertas o notificaciones estaban en el header y dentro de esas mismas páginas.
- **No se borró código:** los componentes de alertas y notificaciones siguen en el repositorio.
- **Pruebas:** 67 en verde. Hay tests nuevos de la bandera (sin campana, sin rutas, el cliente va a Ofertas, no se consulta el contador y al encenderla vuelve la campana). Además, `ENABLE_ALERTS=true npm run build` activa todo.

## Ronda de pruebas (rama `pruebas`)

- **Cobertura:** `npm run test:coverage` (Karma con `karma.conf.js`). Pasó de 77,8 % a 94,6 % en líneas y de 63,8 % a 80,6 % en ramas. Las pruebas pasaron de 67 a 147.
  - La cifra de antes estaba inflada: login, registro, catálogo, panel de la tienda, ubicación de la tienda y confirmación de correo no tenían ninguna prueba, y Karma no los mostraba.
- **Pruebas nuevas:**
  - guards y rutas;
  - interceptor y servicio de sesión;
  - contrato del servicio de API;
  - login y registro;
  - catálogo, con debounce y respuestas tardías;
  - Ofertas;
  - ubicación;
  - chat y armador de combos;
  - panel de la tienda y ubicación de la tienda;
  - confirmación de correo y perfil;
  - bordes de validaciones y pipes.
- **Bugs corregidos:**
  - Si una petición hecha con el token anterior respondía 401 después de iniciar sesión de nuevo, el interceptor cerraba la sesión nueva. Ahora solo se cierra la sesión que hizo la petición.
  - El formulario de producto aceptaba fechas que no existen, como 2026-02-30, y la API después las rechazaba. Ahora el formulario las marca, igual que la API.
  - Un precio ausente se mostraba como "$ 0", como si el producto fuera gratis. Ahora no se muestra nada.
  - Entre 975 y 999 m las distancias se mostraban como "a 1000 m". Ahora se muestran como "a 1,0 km".
- **Scripts nuevos:** `npm run lint` (revisa los tipos de la app y de las pruebas), `npm run test:ci` y `npm run test:coverage`.
- **Integración continua:** `.github/workflows/ci.yml`. Corre en cada push y pull request con Node 20: `npm ci`, lint, build y pruebas en Chrome headless. La insignia está en el README.
- **Documentación:** `TESTING.md`.
- **Variables nuevas:** ninguna.
- **Cómo probar:** `npm run test:coverage`.

## Simplificación (rama `simplificar`)

- **Ubicación eliminada:**
  - Se quitaron el botón "Usar mi ubicación", el permiso de Geolocation, el servicio de ubicación, el pipe y el cálculo de distancias.
  - Ofertas ya no tiene orden "Más cerca" ni filtro por radio.
  - Ofertas, el catálogo y el chat ya no muestran distancias.
  - El panel de la tienda ya no tiene la sección de ubicación. Muestra el nombre, el barrio, la dirección y el teléfono como texto.
  - Las alertas pausadas quedan solo por barrio.
- **Cercanía por barrio:** filtro de barrio en Ofertas y en el catálogo. En el chat, el selector "Tu barrio" filtra la búsqueda. Si el cliente pide algo "cerca" sin barrio, el asistente se lo pregunta.
- **Combos eliminados:** se quitaron el armador de combos del chat y su llamada a la API.
- **Privacidad:** bajo el campo del chat se lee "Tu mensaje se procesa con un servicio de IA externo; no escribas datos personales."
- **Textos:** los de ayuda, inicio, catálogo y Ofertas hablan de barrio y no de ubicación o distancia.
- **Pruebas:** 134 en verde, con 95,0 % de líneas y 79,9 % de ramas. Se borraron las de ubicación, distancias y combos.
- **Recorrido en el navegador** a 360, 768 y 1280 px, contra el backend local con el seed:
  - Ofertas, con el filtro de Chapinero;
  - catálogo de Suba;
  - chat ("pollo asado cerca" pide el barrio; con Suba elegido solo trae Suba);
  - panel de la tienda: 7 productos, sugerencias y sin ubicación;
  - perfil, registro de cliente y de tienda, y login de cliente que entra a Ofertas.
  - No hubo errores de consola ni desborde horizontal.
- **Compatibilidad:** funciona con el backend actual y con el nuevo, porque ya no envía coordenadas ni llama a los combos.

## Recuperación de contraseña por correo (rama `correo`)

- **`/reset-password`:**
  - si el enlace venció, ya se usó o fue reemplazado, se oculta el formulario y aparece el botón "Pedir un enlace nuevo";
  - un token cortado por el cliente de correo se trata como enlace incompleto;
  - el token se quita de la barra de direcciones al cargar la página.
  - Las contraseñas se validan como en el registro y, al guardar, la persona va al login con un aviso.
- **`/forgot-password`:** aclara que se usa el correo con el que se creó la cuenta y, tras el mensaje genérico, permite pedir otro enlace.
- **Login:** el enlace "¿Olvidaste tu contraseña?" sigue visible.
- **Verificación:** recorrí el flujo completo en un celular de 360 px con el build de producción, servido con las mismas reglas de `vercel.json`, contra la API local:
  - pedí el enlace con el correo en mayúsculas;
  - el enlace del correo abrió `/reset-password`;
  - cambié la contraseña e inicié sesión con la nueva;
  - el mismo enlace dejó de servir;
  - llegó el aviso de contraseña cambiada.
  - No hubo errores, salvo el 400 esperado del enlace usado, ni desborde horizontal.
- **Pruebas:** 141 en verde (95,3 % de líneas, 81,2 % de ramas).
- **Variables nuevas:** ninguna.

## Supabase Auth opcional (rama `supabase-auth`)

- **`AUTH_PROVIDER`, `SUPABASE_URL` y `SUPABASE_ANON_KEY`:** se leen en el build desde Vercel. Con `legacy` (por defecto) todo sigue igual.
- **Protecciones del build:** se detiene si falta configuración o si `SUPABASE_ANON_KEY` es una clave secreta (`service_role` o `sb_secret_…`).
- **Modo `supabase`:**
  - registro con confirmación por enlace y aviso al volver al login;
  - login con `signInWithPassword` y reenvío de la confirmación;
  - recuperación con código de 6 dígitos (`verifyOtp` de tipo `recovery` y `updateUser`), con espera de 60 s para pedir otro;
  - cambio de contraseña y de correo con Supabase, y del nombre con la API;
  - el token se renueva solo.
- **supabase-js 2.117.2:** se carga solo en este modo, así que el bundle inicial del modo `legacy` no crece.
- **Pruebas:** 158 en verde (95,2 % de líneas, 79,1 % de ramas), con supabase-js simulado.
- **Variables nuevas en Vercel:** `AUTH_PROVIDER`, `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Rediseño completo (rama `rediseno`)

### Qué cambió

- **Identidad nueva, sin verde:** mercado de barrio moderno con rojo tomate, amarillo maíz, azul tinta y crema (carbón en oscuro), tokens por tema en `styles.scss`, fuentes autohospedadas (Bricolage Grotesque y Figtree), tarjetas con forma de etiqueta de precio, íconos e ilustraciones propias en SVG. Se quitaron los emojis.
- **Tema claro y oscuro** con la preferencia del sistema por defecto, botón en el header, elección guardada con try/catch y sin parpadeo (script en `index.html`). Contraste AA comprobado en una prueba.
- **Animaciones suaves** (hover, entrada al hacer scroll) que respetan `prefers-reduced-motion`.
- **Header:** "SB" + "Stock Barrio", sin "Inicio" ni "IA", compacto al hacer scroll, menú móvil, y Mi tienda o Mi cuenta según el rol. Título de la pestaña: "Stock Barrio".
- **Inicio:** mensaje "Ayudamos al ciudadano a encontrar el mejor producto al mejor precio y con los mejores descuentos cerca de su barrio.", locales afiliados y ofertas destacadas, con estados vacíos.
- **Ofertas:** solo filtro por categoría, mayor descuento primero, los más rebajados destacados y "Oferta hasta…".
- **Catálogo:** sin ofertas, agrupado por local, solo filtro por categoría.
- **Asistente:** sin selector de barrio, botones "Ofertas de hoy" y "Tiendas cercanas"; el barrio se pregunta en el chat y se recuerda en memoria.
- **Panel:** varios locales (crear, renombrar, eliminar), inventario en tabla que pasa a tarjetas en el celular (sin imágenes), sugerencias con rango de fechas y aviso de que los no perecederos no se sugieren, y formulario con "Fecha de inicio" y "Fecha de finalización".
- **Datos desde cero:** la app ya no menciona tiendas de demostración; todas las pantallas tienen estados vacíos.
- **Banners:** lugar preparado en `src/app/banners.ts` (vacío) y reglas de licencia y créditos en `public/img/CREDITOS.md`.
- Se quitó `favicon.ico` (era el de Angular) y se agregó `favicon.svg` con el isotipo.

### Requiere

El backend de la rama `rediseno` (catálogo agrupado, locales, fechas de oferta y "tiendas cercanas"). El backend nuevo sigue sirviendo al frontend anterior, así que el orden es backend primero.

### Variables nuevas

Ninguna. Siguen `AUTH_PROVIDER`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `ENABLE_ALERTS` (apagada).

### Pruebas

208 pruebas (antes 158), 96,65 % de líneas y 80,66 % de ramas. Recorrido automático sin desbordes ni errores a 320, 360, 768, 1024, 1280 y 1920 px, en claro y oscuro, con datos y con la base vacía. Pruebas manuales en el README.

## Ajustes al probar como usuario (rama `ajustes`)

### Plan de limpieza (escrito antes de borrar)

Se quita solo código que nadie usa, sin cambiar lo que ve la persona. Se conserva `AUTH_PROVIDER=legacy`.

| Qué se quita | Por qué |
| --- | --- |
| Páginas `/alertas` y `/notificaciones`, `NotificationsService`, la campana del header, sus rutas, modelos y llamadas a la API, `alerts-flag.spec.ts` | Estaban apagadas con `enableAlerts` y no se van a reactivar |
| La bandera `enableAlerts` de `environment.ts` y la variable `ENABLE_ALERTS` de `scripts/set-env.mjs` | Ya no hay nada que encender; los textos de login y registro que dependían de ella quedan con su versión actual |
| `ApiService.getProducts` y `getNeighborhoods` | Ninguna pantalla los usa (el catálogo usa `getCatalog`; los barrios solo los usaban las alertas) |
| Clases globales `.button-corn` y `label.field-label` | Ninguna plantilla las usa |
| Comentarios obvios, y el resto pasa a español | Regla del proyecto: código en inglés; comentarios y textos en español |

### Qué cambió

1. **Eliminar un local:** la confirmación avisa que también se quitarán sus productos (con su cantidad).
2. **Catálogo completo:** muestra todos los productos, también los que están en oferta, con la etiqueta "En oferta", el precio con descuento y el original tachado. Ofertas sigue mostrando solo las activas.
3. **Ver u ocultar la contraseña:** `<app-password-field>` en todos los campos de contraseña de la app, accesible y sin librerías. Al probarlo en Chrome real apareció un error que las pruebas no veían (con un clic real el cursor volvía al inicio) y quedó corregido.
4. **Un correo, una cuenta:** correo normalizado en todos los formularios, alias con `+` rechazados en el registro y el cambio de correo, revisión del buzón con `POST /api/auth/check-email` antes de registrar y de cambiar el correo, y en modo supabase los mensajes para el correo ya vinculado o sin confirmar.
5. **Limpieza** según el plan de arriba. Los comentarios pasaron a español.

### Variables

Ninguna nueva. Se quita `ENABLE_ALERTS` del build (si está en Vercel, se puede borrar; si se queda, no hace nada).

### Requiere

El backend de la rama `ajustes` (catálogo con ofertas y `check-email`). Con el backend anterior, el registro mostraría un error al revisar el correo, así que el orden es backend primero.

### Pruebas manuales

Ver la lista del README (puntos 11 a 13 son de esta ronda), más el punto 2 de arriba en el catálogo.
