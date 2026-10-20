# StockBarrio - Frontend

[![CI](https://github.com/Pipemora1324/stockbarrio-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Pipemora1324/stockbarrio-frontend/actions/workflows/ci.yml)

Interfaz web de StockBarrio, una aplicación para tiendas y clientes de barrio: las tiendas gestionan su inventario y aprueban descuentos sugeridos para lo que está por vencer, y los clientes buscan productos y ofertas en su barrio con ayuda de un chat. Está hecha con Angular 20 (componentes standalone, signals, SCSS).

La API (Node.js + Express + PostgreSQL) está en un repositorio aparte: [stockbarrio-backend](https://github.com/Pipemora1324/stockbarrio-backend).

## Páginas

| Ruta | Qué muestra | Acceso |
| --- | --- | --- |
| `/` | Inicio con tiendas y ofertas | Público |
| `/ofertas` | Productos con descuento, con filtros por barrio, categoría y texto, y orden por descuento o vencimiento (los filtros quedan en la URL) | Público |
| `/catalogo` | Catálogo con filtros por barrio, categoría y nombre (`?barrio=` filtra al entrar) | Público |
| `/chat` | Chat con el asistente ("¿dónde puedo encontrar pollo asado?", "ofertas de hoy") con historial, tarjetas de resultados y selector de barrio | Público |
| `/login` | Inicio de sesión | Público |
| `/register` | Registro de cliente o de tienda (`?tipo=tienda` abre el de tienda) | Público |
| `/admin` | Panel de la tienda: datos de la tienda como texto, inventario y descuentos sugeridos | Rol `store` |
| `/alertas` | Alertas de descuento del cliente (pausada, ver abajo) | Rol `customer` |
| `/notificaciones` | Bandeja de notificaciones, con enlace a la oferta (pausada, ver abajo) | Rol `customer` |
| `/perfil` | Cambiar nombre, contraseña y correo | Con sesión |
| `/forgot-password` · `/reset-password` · `/confirm-email` | Recuperar la contraseña y confirmar un correo nuevo desde el enlace del correo | Público |

Todas las peticiones a la API se hacen a la ruta relativa `/api`, así que quien sirve el frontend tiene que redirigir `/api` hacia el backend.

## Alertas y notificaciones (pausadas)

Por ahora solo se muestra la sección de Ofertas. Las alertas, la bandeja de notificaciones y la campana del header están apagadas con la bandera `enableAlerts` de `src/environments/environment.ts`, que es `false` por defecto.

Con la bandera apagada:

- Las rutas `/alertas` y `/notificaciones` no se registran (llevan al inicio).
- El header no muestra la campana ni "Mis alertas", y no se consulta el contador.
- El cliente entra a `/ofertas` al iniciar sesión.
- Los textos de login y registro no mencionan alertas.

El código no se borró: solo queda oculto.

Para reactivarlas:

1. En Vercel, define `ENABLE_ALERTS=true`. Antes de `npm run build`, `scripts/set-env.mjs` escribe ese valor en `environment.ts`. Sin la variable, el archivo no se toca.
2. En local, cambia `enableAlerts` a `true` en `src/environments/environment.ts`.
3. Activa también `ENABLE_ALERTS=true` en el backend, para que se generen notificaciones.

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
- El panel es solo para cuentas de tienda; las alertas y la bandeja, solo para clientes. La API además comprueba los permisos en cada llamada.
- Al entrar, la tienda va a `/admin` y el cliente a `/alertas`.
- Con las alertas activadas, la campana del header muestra las notificaciones sin leer y se actualiza cada minuto (no consulta con la pestaña oculta).

## Formatos

- Los precios se muestran en pesos colombianos con `Intl.NumberFormat('es-CO')`, sin decimales (pipe `cop`).
- Las fechas de vencimiento son fechas puras `AAAA-MM-DD`: se muestran y se envían como texto (pipe `calendarDate`), sin pasar por `Date`, para que la zona horaria no corra el día.

## Validación de formularios

`src/app/validation/rules.ts` replica las reglas de la API (que es la autoridad) con los mismos mensajes en español. Cada formulario muestra el error debajo del campo al salir de él y deja el botón de envío deshabilitado mientras haya errores.

## Asistente

El chat envía a la API los últimos 6 turnos (mensajes de hasta 500 caracteres) y muestra la respuesta con tarjetas de resultados.

- **Modo básico.** Cuando la API responde sin IA, el mensaje lo indica.
- **Datos reales.** La API valida que todo lo que dice el asistente exista en la base de datos.

## Cercanía y privacidad

- La app no usa la ubicación del navegador ni calcula distancias. La cercanía es por barrio: hay filtro de barrio en Ofertas y en el catálogo, y en el chat el cliente puede elegir "Tu barrio".
- En el chat, "cerca de mí" busca en el barrio que el cliente escriba o elija; si no hay barrio, el asistente lo pregunta y dice en qué barrios hay tiendas.
- Bajo el campo del chat se muestra: "Tu mensaje se procesa con un servicio de IA externo; no escribas datos personales."

## Diseño, rendimiento y accesibilidad

- **Estilos.** Tokens de color, tipografía y foco en `src/styles.scss`. Los colores de texto cumplen el contraste AA sobre blanco.
- **Responsive, empezando por el móvil.** El header se convierte en menú desplegable, las cuadrículas se adaptan al ancho y la tabla del inventario pasa a tarjetas en el celular. Probado sin desbordamiento horizontal a 360, 768 y 1280 px.
- **Tarjetas de producto** con ícono según la categoría, o imagen con `loading="lazy"` si el producto la tiene.
- **Rendimiento.**
  - Las páginas se cargan de forma diferida (salvo el inicio) y todos los componentes usan `ChangeDetectionStrategy.OnPush`.
  - Las listas usan `@for` con `track` y la búsqueda del catálogo usa debounce.
  - Hay estados de carga, vacío y error en todas las páginas.
- **Accesibilidad.**
  - Enlace "Saltar al contenido", etiquetas en todos los campos y foco visible.
  - `aria-live` en resultados y avisos.
  - `aria-expanded` en el menú y títulos de página por ruta.

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
| `npm run build` | Compila para producción en `dist/frontend/browser` (antes aplica `ENABLE_ALERTS`, `AUTH_PROVIDER`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` si están definidas) |
| `npm run watch` | Compila en modo desarrollo y vuelve a compilar con cada cambio |
| `npm test` | Pruebas unitarias y de componentes con Karma, que se vuelven a correr con cada cambio |
| `npm run test:ci` | Una sola pasada de las pruebas en Chrome headless |
| `npm run test:coverage` | Pruebas con reporte de cobertura en `coverage/` |
| `npm run lint` | Revisa los tipos de la app y de las pruebas |

Cómo correr las pruebas, qué cubre cada suite y la cobertura actual: [TESTING.md](TESTING.md).

## Cómo probar todo en local

1. En el backend: `npm run seed` y `npm run dev` (puerto 3000).
2. Aquí: `npm start` y abre http://localhost:4200.
3. Tienda: `tienda.donaluz@stockbarrio.test` / `tienda12345`. En `/admin` revisa el inventario y aprueba una sugerencia de descuento.
4. Cliente: `cliente.demo@stockbarrio.test` / `tienda12345`. Revisa la campana y `/notificaciones`, y crea alertas en `/alertas`.
5. Asistente: en `/chat`, pulsa "huevos baratos"; luego "pollo asado cerca" (te pide el barrio) y elige un barrio en "Tu barrio".

## Estructura

- `src/app/pages`: páginas (`home`, `catalog`, `chat`, `admin`, `alerts`, `notifications`, `login`, `register`).
- `src/app/components`: header y tarjeta de producto.
- `src/app/services`: contador de notificaciones (pausado con las alertas).
- `src/app/validation`: reglas de validación de los formularios.
- `src/app/api.service.ts`: llamadas a la API, con mensajes de error en español.
- `src/app/auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts` y `session.storage.ts`: sesión, protección de rutas y manejo del 401.
- `src/app/pipes` y `src/app/dates.ts`: formato de pesos, fechas y días para vencer en hora de Bogotá.
- `nginx.conf` y `Dockerfile`: imagen para producción.
- `vercel.json`: configuración de Vercel.
