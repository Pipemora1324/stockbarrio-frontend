# Pruebas del frontend

Las pruebas son unitarias y de componentes, con Jasmine y Karma en Chrome. No llaman a la API real: cada prueba usa `HttpTestingController` o un `ApiService` simulado, así que no necesitan el backend, una base de datos ni claves.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm test` | Abre Chrome y vuelve a correr las pruebas con cada cambio |
| `npm run test:ci` | Una sola pasada en Chrome headless (la que usa el CI) |
| `npm run test:coverage` | Una sola pasada con cobertura: tabla por archivo en la consola, `coverage/index.html` y `coverage/coverage-summary.json` |
| `npx ng test --no-watch --browsers=ChromeHeadlessCI --include src/app/pages/chat` | Solo las pruebas de una carpeta o un archivo |
| `npm run lint` | Revisa los tipos de la app y de las pruebas |

Necesitas Chrome o Chromium instalado. Si no está en la ruta habitual, indica dónde con `CHROME_BIN`. `karma.conf.js` define `ChromeHeadlessCI`, que es Chrome headless sin sandbox, como lo necesitan los contenedores de CI.

### Cobertura

Karma solo mide los archivos que alguna prueba importa. Un archivo sin ninguna prueba no sale en la tabla con 0 %: simplemente no aparece. Por eso la cobertura "de antes" estaba inflada: login, registro, catálogo, el panel de la tienda, la ubicación de la tienda y la confirmación de correo no tenían pruebas y ni aparecían. La prueba de rutas (`app.routes.spec.ts`) carga todas las páginas perezosas, así que ahora todas entran en la medición.

Hay dos archivos que no se miden:

- `app.config.ts`, que solo es configuración;
- `notifications.component.ts`, porque su ruta no existe mientras las alertas están pausadas.

## Qué cubre cada suite

| Archivo | Qué prueba |
| --- | --- |
| `auth.spec.ts` | Guards de tienda, cliente y sesión. Interceptor: añade el token solo a `/api`, cierra la sesión con un 401, no la cierra en un login fallido ni cuando un 401 tardío llega con un token anterior. Servicio de sesión: login, registro, inicio por rol, cerrar sesión, aviso de sesión vencida |
| `supabase-auth.spec.ts` | Modo `AUTH_PROVIDER=supabase` con supabase-js simulado (nada llama a Supabase): login con el token de Supabase hacia `/api/auth/me`, credenciales incorrectas, perfil rechazado por la API (cierra la sesión de Supabase), correo sin confirmar con reenvío, aviso al volver del enlace, registro con metadata y estado "Revisa tu correo", errores en español, recuperación con código correcto, incorrecto o vencido, validación del código y de la contraseña, espera de 60 s para pedir otro código, sesión expirada, token renovado, cierre de sesión, cambio de contraseña, correo y nombre desde el perfil |
| `session.storage.spec.ts` | Sesión guardada válida, JSON dañado, rol desconocido y almacenamiento que falla |
| `app.routes.spec.ts` | Guards en `/admin` y `/perfil`, carga de cada página y su título, redirecciones de visitantes y clientes, direcciones desconocidas |
| `alerts-flag.spec.ts` | Con `enableAlerts` apagada: sin campana, sin rutas de alertas y el cliente entra a Ofertas |
| `api.service.spec.ts` | Contrato con la API: método, ruta y cuerpo de cada llamada; ofertas y chat nunca envían coordenadas; ya no existen las llamadas de ubicación de la tienda ni de combos; los filtros vacíos no se envían; errores con mensaje en español, mensaje por defecto y sin conexión |
| `validation/rules.spec.ts` | Todas las reglas de los formularios, con sus bordes: precios, stock, descuento, fechas reales (no 30 de febrero), calendario de Bogotá a medianoche, bisiestos, teléfonos fijos, contraseñas con tildes contadas en bytes |
| `pipes/format.pipes.spec.ts` | Pesos sin decimales (y vacío cuando falta el valor), fechas sin correrse de día, etiquetas de vencimiento |
| `pages/login` | Botón deshabilitado, error de la API, estado de carga, aviso de sesión vencida, sin textos de alertas |
| `pages/register` | Cliente y tienda (`?tipo=tienda`), datos recortados y en minúscula, teléfono opcional, mensajes al salir del campo, contraseña igual al correo, error 409 |
| `pages/catalog` | Debounce de 350 ms con una sola búsqueda, búsqueda inmediata con el botón, una respuesta vieja no pisa a la nueva, error con reintento, barrio desde la URL |
| `pages/offers` | Filtros desde la URL, solo filtro por barrio (sin ubicación, radio ni orden por cercanía), respuestas tardías, error y "Quitar filtros", texto de una letra |
| `pages/chat` | Historial de seis turnos, modo básico, barrio como filtro, sin botón de ubicación ni distancias, aviso de privacidad bajo el campo, envíos dobles, máximo de 500 caracteres |
| `pages/admin` | Panel de la tienda (datos solo como texto y sin sección de ubicación, totales, filtro, tienda no asociada, error y reintento, borrar con confirmación, fallo al borrar, formulario nuevo por producto), formulario de producto, sugerencias de descuento |
| `pages/account` | Recuperar la contraseña (correo válido, mensaje genérico, pedir otro enlace, 503 sin correo configurado), restablecerla (contraseña nueva y repetida, enlace incompleto o cortado, enlace vencido o usado con botón para pedir otro, token fuera de la URL, aviso en el login), confirmar el correo, cambiar nombre y correo, errores de cada formulario |
| `components/product-card`, `services/notifications.service.spec.ts`, `pages/alerts` | Tarjeta de producto y la parte de alertas (pausada) |

## Resultado actual

158 pruebas, todas en verde (unos 2 s de ejecución en Chrome headless, más la compilación).

| Métrica | Recuperación por correo | Ahora (Supabase Auth) |
| --- | --- | --- |
| Líneas | 95,3 % | 95,2 % |
| Ramas | 81,2 % | 79,1 % |

Lo que queda sin cubrir es sobre todo:

- la página de inicio y el menú del header, que son de presentación;
- la parte de alertas, que está pausada;
- algunas ramas de mensajes por defecto, cuando un error no trae texto.

## Integración continua

`.github/workflows/ci.yml` corre en cada push y pull request con Node 20: `npm ci`, `npm run lint`, `npm run build` y `npm run test:coverage` en Chrome headless. El reporte de cobertura queda como artefacto del job durante 7 días.
