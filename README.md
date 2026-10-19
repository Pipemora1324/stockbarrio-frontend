# StockBarrio - Frontend

Interfaz web de StockBarrio, una aplicación de inventario para tiendas y mercados de barrio. Está hecha con Angular 20.

La API (Node.js + Express + PostgreSQL) está en un repositorio aparte: [stockbarrio-backend](https://github.com/Pipemora1324/stockbarrio-backend).

## Páginas

| Ruta | Qué muestra |
| --- | --- |
| `/` | Inicio |
| `/catalogo` | Catálogo de productos con búsqueda y filtros |
| `/chat` | Recomendaciones de compra según presupuesto y barrio |
| `/login` | Inicio de sesión |
| `/register` | Registro de tienda |
| `/admin` | Panel de la tienda: gestión de sus propios productos (requiere sesión con rol `store`) |

Todas las peticiones a la API se hacen a la ruta relativa `/api`, así que quien sirve el frontend tiene que redirigir `/api` hacia el backend.

## Sesión

- El token y el usuario se guardan en `localStorage`. Si esos datos están dañados o el navegador bloquea el almacenamiento, la app arranca sin sesión en vez de fallar.
- Al iniciar, la app valida el token con `GET /api/auth/me` en segundo plano. Si la API no responde (por ejemplo, mientras Render despierta), la sesión se mantiene.
- Un interceptor agrega el token a las llamadas a `/api` y, si la API responde 401, cierra la sesión y lleva al login con un aviso.
- El panel solo es accesible para cuentas de tienda. La API además comprueba que cada producto pertenezca a la tienda del usuario.

## Formatos

- Los precios se muestran en pesos colombianos con `Intl.NumberFormat('es-CO')`, sin decimales (pipe `cop`).
- Las fechas de vencimiento son fechas puras `AAAA-MM-DD`: se muestran y se envían como texto (pipe `calendarDate`), sin pasar por `Date`, para que la zona horaria no corra el día.

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
| `npm run build` | Compila para producción en `dist/frontend/browser` |
| `npm run watch` | Compila en modo desarrollo y vuelve a compilar con cada cambio |
| `npm test` | Pruebas unitarias con Karma (en modo continuo: `npx ng test --watch=false --browsers=ChromeHeadless`) |

## Estructura

- `src/app/pages`: páginas de la aplicación.
- `src/app/components`: componentes compartidos (cabecera).
- `src/app/api.service.ts`: llamadas a la API.
- `src/app/auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts` y `session.storage.ts`: sesión, protección de rutas y manejo del 401.
- `src/app/pipes`: formato de pesos y de fechas.
- `nginx.conf` y `Dockerfile`: imagen para producción.
- `vercel.json`: configuración de Vercel.
