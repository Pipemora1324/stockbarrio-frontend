# Stock Barrio - Frontend

[![CI](https://github.com/Pipemora1324/stockbarrio-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Pipemora1324/stockbarrio-frontend/actions/workflows/ci.yml)

Interfaz web de Stock Barrio, una aplicación para tiendas y clientes de barrio: ayuda al ciudadano a encontrar el mejor producto al mejor precio y con los mejores descuentos cerca de su barrio. Las tiendas manejan uno o varios locales, su inventario y sus ofertas con fechas, y los clientes buscan productos y ofertas con ayuda de un chat. Está hecha con Angular 20 (componentes standalone, signals, SCSS).

La API (Node.js + Express + PostgreSQL) está en un repositorio aparte: [stockbarrio-backend](https://github.com/Pipemora1324/stockbarrio-backend).

## Páginas

| Ruta | Qué muestra | Acceso |
| --- | --- | --- |
| `/` | Inicio: el mensaje de la app, los locales afiliados (con sus ofertas de hoy) y las ofertas con mayor descuento, con estados vacíos y llamadas a la acción | Público |
| `/ofertas` | Ofertas activas hoy, con un único filtro por categoría (`?categoria=`), del mayor descuento al menor; los más rebajados destacan y cada oferta dice hasta cuándo dura | Público |
| `/catalogo` | Todos los productos activos, agrupados por local con su encabezado (`#local-<id>` salta a uno), con un único filtro por categoría. Los que están en oferta muestran "En oferta", el precio con descuento y el original tachado | Público |
| `/chat` | Asistente con historial, indicador de "escribiendo", tarjetas de resultados y de tiendas, y botones "Ofertas de hoy" y "Tiendas cercanas" (sin selector de barrio) | Público |
| `/login` | Inicio de sesión | Público |
| `/register` | Registro de cliente o de tienda (`?tipo=tienda` abre el de tienda) | Público |
| `/admin` | Panel del vendedor: sus locales (crear, renombrar, eliminar), inventario del local elegido (`?local=`) en tabla, descuentos sugeridos y formulario de producto con fechas de la oferta | Rol `store` |
| `/perfil` | Cambiar nombre, contraseña y correo | Con sesión |
| `/forgot-password` · `/reset-password` · `/confirm-email` | Recuperar la contraseña y confirmar un correo nuevo desde el enlace del correo | Público |

Todas las peticiones a la API se hacen a la ruta relativa `/api`, así que quien sirve el frontend tiene que redirigir `/api` hacia el backend.

## Recuperar la contraseña

1. En el login, "¿Olvidaste tu contraseña?" lleva a `/forgot-password`. Ahí se escribe el correo con el que se creó la cuenta.
2. La respuesta es siempre la misma, exista o no la cuenta. Si el correo no llega, se puede pedir otro enlace; el anterior deja de servir.
3. El enlace del correo abre `/reset-password?token=…`. La página quita el token de la barra de direcciones apenas carga, para que no quede en el historial ni se comparta por error.
4. Se escribe la contraseña nueva dos veces, con las mismas reglas del registro. Al guardarla, se cierran las demás sesiones y la persona va al login con un aviso.
5. Si el enlace venció (30 minutos), ya se usó o se pidió uno más nuevo, la página lo dice y muestra el botón "Pedir un enlace nuevo".

En Vercel, la regla `{ "source": "/(.*)", "destination": "/index.html" }` de `vercel.json` hace que `/reset-password` abra la app aunque se entre directo desde el correo, también en el celular. El backend arma el enlace con su variable `APP_URL`, que debe ser la URL de Vercel.

## Autenticación: legacy o Supabase Auth

La variable de Vercel `AUTH_PROVIDER` elige el modo al compilar (`scripts/set-env.mjs` la escribe en `src/environments/environment.ts`):

| Variable | Valor |
| --- | --- |
| `AUTH_PROVIDER` | `legacy` (por defecto) o `supabase` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` (solo con `supabase`) |
| `SUPABASE_ANON_KEY` | la clave pública **anon** o **publishable**. El build se detiene si falta o si es una clave secreta |

- **`legacy`:** login, registro y recuperación por enlace con la API, como siempre.
- **`supabase`:**
  - **Registro:** usa `supabase.auth.signUp`, con los datos del perfil en la metadata. Muestra "Revisa tu correo", y el enlace de confirmación vuelve a `/login` con el aviso "Tu correo quedó confirmado".
  - **Login:** `signInWithPassword`. El access token de Supabase va como `Bearer` a la API, que devuelve el perfil y el rol desde `public.users`. Si el correo no está confirmado, el login ofrece "Reenviar correo de confirmación".
  - **"¿Olvidaste tu contraseña?":** pide el correo, envía un código de 6 dígitos y deja escribirlo junto con la contraseña nueva. Con un código equivocado o vencido dice "El código no es válido o ya venció"; el botón "Pedir otro código" se habilita a los 60 segundos.
  - **Perfil:** la contraseña y el correo se cambian en Supabase (se pide la contraseña actual) y el nombre en la API.
  - **Sesión:** supabase-js renueva el token solo y la app usa siempre el más reciente. Si la sesión de Supabase termina, la app vuelve al login con un aviso.
  - **Peso:** supabase-js se descarga solo en este modo, así que el build `legacy` no crece.

La guía del panel de Supabase y las pruebas manuales están en [SUPABASE_AUTH.md](https://github.com/Pipemora1324/stockbarrio-backend/blob/main/SUPABASE_AUTH.md) del backend.

## Sesión

- El token y el usuario se guardan en `localStorage`. Si esos datos están dañados o el navegador bloquea el almacenamiento, la app arranca sin sesión en vez de fallar.
- Al iniciar, la app valida el token con `GET /api/auth/me` en segundo plano. Si la API no responde (por ejemplo, mientras Render despierta), la sesión se mantiene.
- Un interceptor agrega el token a las llamadas a `/api` y, si la API responde 401, cierra la sesión y lleva al login con un aviso.
- El panel es solo para cuentas de tienda. La API además comprueba los permisos en cada llamada.
- Al entrar, la tienda va a `/admin` y el cliente a `/ofertas`.

## Formatos

- Los precios se muestran en pesos colombianos con `Intl.NumberFormat('es-CO')`, sin decimales (pipe `cop`).
- Las fechas de vencimiento son fechas puras `AAAA-MM-DD`: se muestran y se envían como texto (pipe `calendarDate`), sin pasar por `Date`, para que la zona horaria no corra el día.

## Validación de formularios

`src/app/validation/rules.ts` replica las reglas de la API (que es la autoridad) con los mismos mensajes en español. Cada formulario muestra el error debajo del campo al salir de él y deja el botón de envío deshabilitado mientras haya errores.

### Contraseñas

Todos los campos de contraseña (inicio de sesión, registro, recuperación con enlace o con código, y perfil) usan `<app-password-field>`, que envuelve el `<input>` de cada pantalla y le agrega un botón de ojo:

- `type="button"`, así nunca envía el formulario; `aria-label` "Mostrar contraseña" u "Ocultar contraseña", `aria-pressed` y `aria-controls`; foco visible en los dos temas.
- Con el mouse, el campo conserva el foco y la posición del cursor; con el teclado se llega al botón con Tab y se alterna con Enter o Espacio.
- Solo cambia el tipo del campo: el valor, la validación y el `autocomplete` (`current-password` o `new-password`) siguen siendo los de cada pantalla. Ícono SVG propio, sin librerías.

### Correos

- Todos los formularios guardan el correo sin espacios y en minúsculas al salir del campo.
- El registro y el cambio de correo no aceptan alias con `+` ("No uses alias con +; escribe tu correo normal."); el login y la recuperación sí, por las cuentas viejas.
- Antes de registrar, la app llama a `POST /api/auth/check-email`, que compara el buzón (las variantes de Gmail con puntos o `googlemail.com` cuentan como el mismo). Si ya tiene cuenta, muestra "Este correo ya está vinculado a una cuenta. Inicia sesión o recupera tu contraseña." con los dos enlaces.
- En modo supabase, si Supabase responde con un usuario ofuscado (sin `identities`), se muestra ese mismo mensaje. Si la cuenta ya existía sin confirmar, la app dice que ya se envió el correo de confirmación y ofrece reenviarlo.

## Asistente

El chat envía a la API los últimos 6 turnos (mensajes de hasta 500 caracteres) y muestra la respuesta con tarjetas de productos y de tiendas.

- **Accesos rápidos.** "Ofertas de hoy" pide las ofertas activas. "Tiendas cercanas" hace que el bot pregunte el barrio dentro del chat; la respuesta se usa como barrio y se muestran los locales de ahí con sus ofertas de hoy.
- **Barrio recordado.** La API devuelve el barrio que usó (`intent.neighborhood`); la app lo recuerda **solo en memoria** (`ChatSessionService`) y lo manda con las preguntas siguientes. Se ve como "Buscando en …" con un botón "Cambiar barrio". El historial también vive en memoria: se conserva al cambiar de página y se pierde al recargar. Nada se guarda en el navegador.
- **Modo básico.** Cuando la API responde sin IA, el mensaje lo indica.
- **Datos reales.** La API valida que todo lo que dice el asistente exista en la base de datos y solo usa ofertas activas.

## Cercanía y privacidad

- La app no usa la ubicación del navegador ni calcula distancias. La cercanía es por barrio, y en el chat el barrio se pregunta en la conversación.
- Bajo el campo del chat se muestra: "Tu mensaje se procesa con un servicio de IA externo; no escribas datos personales."

## Ofertas con fechas y varios locales

- Una oferta tiene **fecha de inicio** y **fecha de finalización** (días de Bogotá). Solo se ve en Ofertas mientras hoy esté entre las dos; antes y después el producto aparece en el catálogo a precio normal. No hay tareas programadas: la API lo decide con la fecha de cada consulta.
- En el formulario de producto, al poner un descuento aparecen las dos fechas, con el rango propuesto de hoy al vencimiento. El inicio mínimo es hoy (salvo una oferta que ya empezó), el fin no puede ser antes del inicio ni después del vencimiento, y un producto vencido no puede tener oferta. Se valida en el formulario y otra vez en la API, con los mismos mensajes.
- En el panel, cada producto muestra su estado: Oferta activa, Oferta programada, Oferta terminada, Sin oferta o Vencido.
- Los descuentos sugeridos son solo para perecederos por vencer. El panel lo aclara: los no perecederos (enlatados, granos, bebidas...) nunca se sugieren, pero se pueden poner en oferta a mano. Al aprobar se eligen las fechas (por defecto, de hoy al vencimiento).
- Un vendedor puede tener hasta 10 locales (Local 1, Local 2...). Al elegir uno se ve su inventario completo; eliminarlo pide confirmación. Sin locales, el panel muestra el formulario "Crea tu primer local".

## Diseño

**Dirección:** un mercado de barrio moderno y comercial, hecho a mano: nada de degradados morados o azules, vidrio esmerilado, emojis ni plantillas genéricas. Se eliminó el verde por completo.

- **Paleta** (tokens en `src/styles.scss`, uno por tema):

  | Token | Claro | Oscuro | Uso |
  | --- | --- | --- | --- |
  | `--color-primary` | rojo tomate `#c2341c` | `#ff6b4e` | botones, marca, acentos |
  | `--color-corn` | amarillo maíz `#f5b700` | `#ffc93c` | cintas de descuento, ofertas destacadas |
  | `--color-ink` | azul tinta `#1a2238` | crema `#f7f1e5` | títulos y texto fuerte |
  | `--color-bg` | crema `#fbf6ec` | carbón `#14161c` | fondo |
  | `--color-blue` | `#1f4e8c` | `#9cc0ff` | foco, avisos de éxito |

  Todos los pares de texto y fondo cumplen **AA (4,5:1) en los dos temas**; `theme.service.spec.ts` lo comprueba sobre los valores reales.
- **Tipografía con carácter, autohospedada** en `public/fonts`: Bricolage Grotesque para títulos y Figtree para el texto (SIL Open Font License). No se piden fuentes a servidores externos.
- **Tarjetas con forma de etiqueta de precio** (esquinas cortadas y el agujero del cordel), cinta con el porcentaje y, para los descuentos más grandes, una etiqueta amarilla más grande.
- **Íconos propios** en SVG (`components/icon`), con trazo del color del texto, e **ilustraciones propias** (`components/illustration`): el puesto de mercado del inicio y las de los estados vacíos. Usan las variables del tema, así que funcionan en claro y en oscuro.
- **Banners fotográficos:** hay un lugar preparado en el inicio (`src/app/banners.ts`, vacío por defecto). Las fotos van descargadas en `public/img` (nunca enlazadas desde otro sitio), solo con licencia libre de Unsplash o Pexels, y con su crédito en `public/img/CREDITOS.md`.
- **Tema claro y oscuro.** Por defecto sigue `prefers-color-scheme`; el botón del header guarda la elección (`localStorage`, con try/catch). `index.html` aplica el tema guardado antes de que Angular arranque, así que no hay parpadeo.
- **Animaciones suaves:** transiciones de color, elevación de tarjetas y botones al pasar el mouse, y entrada al hacer scroll (`RevealDirective`). Con `prefers-reduced-motion` se apagan.
- **Header:** solo el isotipo "SB" y "Stock Barrio". Se compacta y toma fondo sólido al hacer scroll, y en el celular se vuelve un menú. Navegación: Ofertas, Catálogo, Asistente y, según el rol, Mi tienda o Mi cuenta. La pestaña dice "Stock Barrio".

## Rendimiento y accesibilidad

- **Responsive, empezando por el móvil.** Revisado automáticamente a 320, 360, 768, 1024, 1280 y 1920 px, en claro y en oscuro, en todas las rutas y también con la base vacía: sin desbordes horizontales ni errores de consola. La tabla del inventario pasa a tarjetas en el celular y las píldoras de categorías se desplazan dentro de su fila.
- **Rendimiento.** Las páginas se cargan de forma diferida (salvo el inicio), todos los componentes usan `OnPush`, las listas usan `@for` con `track` y el bundle inicial pesa unos 372 kB (106 kB comprimido).
- **Accesibilidad.**
  - Enlace "Saltar al contenido" y foco visible en los dos temas.
  - Etiquetas en todos los campos, `aria-invalid` y mensajes de error asociados.
  - El filtro de categorías usa botones de radio con leyenda; los locales del panel son un `radiogroup`.
  - `aria-live` en resultados y avisos, `aria-expanded` en el menú y `aria-current` en la navegación.
  - Las ilustraciones son decorativas (`aria-hidden`) y nunca son la única forma de dar un mensaje.

## Requisitos

- Node.js 20 o superior y npm.

## Correr en desarrollo

```bash
npm install
npm start
```

La app queda en http://localhost:4200. `ng serve` usa `proxy.conf.json` para redirigir `/api` a la API local en http://localhost:3000, así que levanta primero el backend.

## Correr con Docker

La imagen compila la app y la sirve con nginx. nginx redirige `/api` a la URL de la variable `API_URL` (por defecto la API desplegada en Render).

```bash
docker build -t stockbarrio-frontend .
docker run -p 4200:80 stockbarrio-frontend
```

Para usar una API local:

```bash
docker run -p 4200:80 -e API_URL=http://host.docker.internal:3000 stockbarrio-frontend
```

## Despliegue en Vercel

`vercel.json` instala, compila y publica `dist/frontend/browser`. También redirige `/api/*` a https://stock-barrios-app.onrender.com y envía el resto de rutas a `index.html` para que funcione el enrutado de Angular.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run build` | Compila para producción en `dist/frontend/browser` (antes aplica `AUTH_PROVIDER`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` si están definidas) |
| `npm run watch` | Compila en modo desarrollo y vuelve a compilar con cada cambio |
| `npm test` | Pruebas unitarias y de componentes con Karma, que se vuelven a correr con cada cambio |
| `npm run test:ci` | Una sola pasada de las pruebas en Chrome headless |
| `npm run test:coverage` | Pruebas con reporte de cobertura en `coverage/` |
| `npm run lint` | Revisa los tipos de la app y de las pruebas |

Cómo correr las pruebas, qué cubre cada suite y la cobertura actual: [TESTING.md](TESTING.md).

## Cómo probar todo en local

1. En el backend: `npm run seed:dev` (solo desarrollo; carga tiendas de ejemplo con correos `@stockbarrio.test`) y `npm run dev` (puerto 3000).
2. Aquí: `npm start` y abre http://localhost:4200.
3. Entra con una de las tiendas de ejemplo que lista el README del backend, o crea una cuenta de tienda.
4. La app no depende de esos datos: con la base vacía todas las pantallas muestran su estado vacío.

### Pruebas manuales

1. **Tema:** cambia a oscuro con el botón del header, recarga (no debe parpadear) y revisa que el texto se lea bien. Con el sistema en oscuro y sin elección guardada, la app arranca en oscuro.
2. **Header:** baja en cualquier página: se compacta. En el celular abre y cierra el menú, también con Escape.
3. **Inicio:** se ven el mensaje, los locales afiliados y las ofertas destacadas. Con la base vacía, los dos estados vacíos con sus botones.
4. **Ofertas:** elige una categoría (cambia la URL), mira las etiquetas destacadas y la fecha "Oferta hasta…".
5. **Catálogo:** aparecen todos los productos; los que están en oferta muestran "En oferta" y el precio original tachado. Cada local tiene su encabezado y desde el inicio un local lleva a su grupo.
6. **Asistente:** "Tiendas cercanas" → responde con un barrio → aparecen las tiendas y "Buscando en …"; luego pregunta por un producto y "Cambiar barrio".
7. **Panel:** crea "Local 2", cámbiate entre locales, renombra y elimina (confirma). Crea un producto con descuento y fechas; prueba un inicio de ayer y un fin después del vencimiento.
8. **Sugerencias:** aprueba una cambiando la fecha de fin; la tabla muestra el rango y "Oferta activa".
9. **Responsive y teclado:** a 320 px no hay scroll horizontal; recorre el panel solo con Tab y Enter.
10. **Movimiento reducido:** con `prefers-reduced-motion` activado no hay animaciones.
11. **Contraseñas:** en login, registro, recuperación y perfil, el ojo muestra y oculta la contraseña sin enviar el formulario, en claro, en oscuro y en el celular; el cursor se queda donde estaba.
12. **Correos:** el registro rechaza `ana+x@correo.co` y, para un buzón que ya tiene cuenta (también `nombreapellido@gmail.com` frente a `nombre.apellido@gmail.com`), muestra el mensaje con los enlaces a iniciar sesión y recuperar la contraseña.
13. **Eliminar un local:** la confirmación avisa que también se quitarán sus productos; después ya no aparecen en Ofertas, el catálogo ni el chat.

## Estructura

- `src/app/pages`: páginas (`home`, `offers`, `catalog`, `chat`, `admin`, `account`, `login`, `register`).
- `src/app/components`: header, etiqueta de precio, filtro de categorías, campo de contraseña, íconos, ilustraciones y la directiva de entrada al hacer scroll.
- `src/app/services`: tema claro y oscuro, conversación del chat en memoria y Supabase.
- `src/app/banners.ts` y `public/img/CREDITOS.md`: banners fotográficos (vacíos) y créditos.
- `public/fonts`: fuentes autohospedadas con sus licencias.
- `src/app/validation`: reglas de validación de los formularios.
- `src/app/api.service.ts`: llamadas a la API, con mensajes de error en español.
- `src/app/auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts` y `session.storage.ts`: sesión, protección de rutas y manejo del 401.
- `src/app/pipes` y `src/app/dates.ts`: formato de pesos, fechas y días para vencer en hora de Bogotá.
- `nginx.conf` y `Dockerfile`: imagen para producción.
- `vercel.json`: configuración de Vercel.
