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
| `/admin` | Gestión de productos (requiere sesión) |

Todas las peticiones a la API se hacen a la ruta relativa `/api`, así que quien sirve el frontend tiene que redirigir `/api` hacia el backend.

## Requisitos

- Node.js 20 o superior y npm.

## Correr en desarrollo

```bash
npm install
npm start
```

La app queda en http://localhost:4200. Ten en cuenta que `ng serve` no tiene configurado un proxy para `/api`, así que para probar contra la API conviene usar Docker (abajo) o agregar un `proxy.conf.json`.

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
| `npm test` | Pruebas unitarias con Karma |

## Estructura

- `src/app/pages`: páginas de la aplicación.
- `src/app/components`: componentes compartidos (cabecera).
- `src/app/api.service.ts`: llamadas a la API.
- `src/app/auth.service.ts` y `auth.guard.ts`: sesión y protección de rutas.
- `nginx.conf` y `Dockerfile`: imagen para producción.
- `vercel.json`: configuración de Vercel.
