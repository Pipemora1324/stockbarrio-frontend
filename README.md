# StockBarrio - Frontend

Interfaz web de StockBarrio, una aplicación para tiendas y clientes de barrio: las tiendas gestionan su inventario y aprueban descuentos sugeridos para lo que está por vencer, y los clientes buscan productos cerca, arman combos y reciben alertas de descuentos. Está hecha con Angular 20 (componentes standalone, signals, SCSS).

La API (Node.js + Express + PostgreSQL) está en un repositorio aparte: [stockbarrio-backend](https://github.com/Pipemora1324/stockbarrio-backend).

## Páginas

| Ruta | Qué muestra | Acceso |
| --- | --- | --- |
| `/` | Inicio con tiendas y ofertas | Público |
| `/ofertas` | Productos con descuento, con filtros por barrio, categoría, texto y cercanía, y orden por descuento, cercanía o vencimiento (los filtros quedan en la URL) | Público |
| `/catalogo` | Catálogo con filtros por barrio, categoría y nombre (`?barrio=` filtra al entrar) | Público |
| `/chat` | Chat con el asistente ("¿dónde puedo encontrar pollo asado?", "ofertas de hoy") con historial, tarjetas de resultados, ubicación o barrio, y combo con presupuesto | Público |
| `/login` | Inicio de sesión | Público |
| `/register` | Registro de cliente o de tienda (`?tipo=tienda` abre el de tienda) | Público |
| `/admin` | Panel de la tienda: inventario, descuentos sugeridos y ubicación | Rol `store` |
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

## Ubicación y privacidad

- La ubicación del navegador solo se pide cuando el usuario pulsa "Usar mi ubicación".
- En el asistente, la ubicación se guarda únicamente en memoria de la pestaña (nunca en `localStorage`) y la API no la almacena.
- Para alertas por cercanía, se envía solo si el cliente marca la casilla de consentimiento, y la API la guarda redondeada (unos 100 m).

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
| `npm run build` | Compila para producción en `dist/frontend/browser` (antes aplica `ENABLE_ALERTS` si está definida) |
| `npm run watch` | Compila en modo desarrollo y vuelve a compilar con cada cambio |
| `npm test` | Pruebas unitarias con Karma (para una sola pasada sin abrir el navegador: `npx ng test --watch=false --browsers=ChromeHeadless`) |

## Cómo probar todo en local

1. En el backend: `npm run seed` y `npm run dev` (puerto 3000).
2. Aquí: `npm start` y abre http://localhost:4200.
3. Tienda: `tienda.donaluz@stockbarrio.test` / `tienda12345`. En `/admin` aprueba una sugerencia de descuento y guarda la ubicación.
4. Cliente: `cliente.demo@stockbarrio.test` / `tienda12345`. Revisa la campana y `/notificaciones`, y crea alertas en `/alertas`.
5. Asistente: en `/chat`, pulsa "busco huevos baratos" y luego "Usar mi ubicación" con "leche cerca de mí".

## Estructura

- `src/app/pages`: páginas (`home`, `catalog`, `chat`, `admin`, `alerts`, `notifications`, `login`, `register`).
- `src/app/components`: header y tarjeta de producto.
- `src/app/services`: ubicación del navegador y contador de notificaciones.
- `src/app/validation`: reglas de validación de los formularios.
- `src/app/api.service.ts`: llamadas a la API, con mensajes de error en español.
- `src/app/auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts` y `session.storage.ts`: sesión, protección de rutas y manejo del 401.
- `src/app/pipes` y `src/app/dates.ts`: formato de pesos, fechas, distancias y días para vencer en hora de Bogotá.
- `nginx.conf` y `Dockerfile`: imagen para producción.
- `vercel.json`: configuración de Vercel.
