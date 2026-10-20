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

`app.config.ts` no se mide: solo es configuración.

## Qué cubre cada suite

| Archivo | Qué prueba |
| --- | --- |
| `auth.spec.ts` | Guards de tienda, cliente y sesión. Interceptor: añade el token solo a `/api`, cierra la sesión con un 401, no la cierra en un login fallido ni cuando un 401 tardío llega con un token anterior. Servicio de sesión: login, registro, inicio por rol, cerrar sesión, aviso de sesión vencida |
| `supabase-auth.spec.ts` | Modo `AUTH_PROVIDER=supabase` con supabase-js simulado (nada llama a Supabase): login con el token de Supabase hacia `/api/auth/me`, credenciales incorrectas, perfil rechazado por la API (cierra la sesión de Supabase), correo sin confirmar con reenvío, aviso al volver del enlace, registro con metadata y estado "Revisa tu correo", errores en español, recuperación con código correcto, incorrecto o vencido, validación del código y de la contraseña, espera de 60 s para pedir otro código, sesión expirada, token renovado, cierre de sesión, cambio de contraseña, correo y nombre desde el perfil |
| `session.storage.spec.ts` | Sesión guardada válida, JSON dañado, rol desconocido y almacenamiento que falla |
| `app.routes.spec.ts` | Guards en `/admin` y `/perfil`, carga de cada página y su título, redirecciones de visitantes y clientes, direcciones desconocidas |
| `api.service.spec.ts` | Contrato con la API: método, ruta y cuerpo de cada llamada (locales, catálogo agrupado, fechas de oferta, rango al aprobar); `storeId` en la query y en el producto nuevo; ofertas y chat nunca envían coordenadas; errores con mensaje en español, mensaje por defecto y sin conexión |
| `services/theme.service.spec.ts` | Tema del sistema por defecto, elección guardada y aplicada, alternar, valor guardado roto, almacenamiento bloqueado; **contraste AA** de los pares de texto y fondo en los dos temas, leído de los estilos reales, y sin verde como color principal |
| `components/header` | Solo "SB" y "Stock Barrio" (sin "Inicio" ni "IA"), Mi tienda o Mi cuenta según el rol, salir, menú móvil con Escape, botón de tema con su etiqueta, compacto al hacer scroll |
| `validation/rules.spec.ts` | Todas las reglas de los formularios, con sus bordes: precios, stock, descuento, fechas reales (no 30 de febrero), calendario de Bogotá a medianoche, bisiestos, teléfonos fijos, contraseñas con tildes contadas en bytes, y el rango de la oferta (inicio desde hoy, fin hasta el vencimiento, producto vencido) |
| `pipes/format.pipes.spec.ts` | Pesos sin decimales (y vacío cuando falta el valor), fechas sin correrse de día, etiquetas de vencimiento |
| `pages/login` | Botón deshabilitado, error de la API, estado de carga, aviso de sesión vencida |
| `components/password-field` | Botón que no envía el formulario, `aria-label`, `aria-pressed` y `aria-controls`, mostrar y ocultar, foco y cursor conservados (también cuando Chrome los mueve tras un clic real), alcanzable con Tab; y en cada pantalla (login, registro, recuperación con código y con enlace, perfil) todos los campos tienen el ojo y el `autocomplete` correcto |
| `pages/register` | Cliente y tienda (`?tipo=tienda`), datos recortados y en minúscula, teléfono opcional, mensajes al salir del campo, contraseña igual al correo, error 409; revisión del correo antes de registrar (ya vinculado con enlaces a iniciar sesión y recuperar), alias con `+`, correo normalizado al salir del campo, cuenta sin confirmar con reenvío |
| `pages/home` | Mensaje de la app, locales afiliados con sus ofertas y enlace a su grupo del catálogo, las 4 ofertas de mayor descuento (la primera destacada), estados vacíos con llamadas a la acción, error con reintento por sección; directiva de entrada (movimiento reducido y `IntersectionObserver`) e ilustraciones decorativas |
| `pages/catalog` | Agrupado por local con encabezado y ancla, un único filtro por categoría desde y hacia la URL, productos en oferta con "En oferta", precio con descuento y original tachado, estados vacíos, error con reintento, una respuesta vieja no pisa a la nueva |
| `pages/offers` | Un único filtro por categoría (sin barrio, búsqueda ni orden), mayor descuento primero, los más rebajados destacados, "Oferta hasta…", estados vacíos, error con reintento, respuestas tardías; filtro de categorías con radios y leyenda |
| `pages/chat` | Sin selector de barrio, botones "Ofertas de hoy" y "Tiendas cercanas", el bot pregunta el barrio y la app lo recuerda en memoria (y se puede cambiar), tarjetas de tiendas y de productos, indicador de "escribiendo", historial al volver a la página, errores locales fuera del historial, línea de privacidad |
| `pages/admin` | Locales como Local 1, Local 2 (elegir, `?local=`, crear con validación, renombrar, eliminar con confirmación, máximo, sin locales), inventario en tabla con descripción, precio, rango de la oferta, estado y stock, sin imágenes y con etiquetas para el celular, filtro, borrar con confirmación, sugerencias por local con rango editable y aviso de perecederos, formulario con fechas de inicio y fin validadas |
| `pages/account` | Recuperar la contraseña (correo válido, mensaje genérico, pedir otro enlace, 503 sin correo configurado), restablecerla (contraseña nueva y repetida, enlace incompleto o cortado, enlace vencido o usado con botón para pedir otro, token fuera de la URL, aviso en el login), confirmar el correo, cambiar nombre y correo, errores de cada formulario |
| `components/product-card` | Etiqueta de precio: cinta, precios, "Oferta hasta…", vencimiento, agotado, destacada, íconos SVG propios por categoría (nunca emojis) |

## Resultado actual

215 pruebas, todas en verde (unos 2 s de ejecución en Chrome headless, más la compilación).

| Métrica | Rediseño | Ahora (ajustes) |
| --- | --- | --- |
| Pruebas | 208 | 215 |
| Líneas | 96,65 % | 98,22 % |
| Ramas | 80,66 % | 82,6 % |
| Funciones | 90,32 % | 94,54 % |

Se quitaron las pruebas de alertas y notificaciones (ya no existen) y se agregaron las del campo de contraseña, el correo en el registro y el perfil, el catálogo completo y el aviso al eliminar un local.

Además del recorrido automático de responsive (320 a 1920 px, claro y oscuro, todas las rutas y la base vacía), que no es parte de `npm test` porque necesita la API y un navegador real; ver las pruebas manuales del README.

Lo que queda sin cubrir es sobre todo:

- algunas ramas de mensajes por defecto, cuando un error no trae texto.

## Integración continua

`.github/workflows/ci.yml` corre en cada push y pull request con Node 20: `npm ci`, `npm run lint`, `npm run build` y `npm run test:coverage` en Chrome headless. El reporte de cobertura queda como artefacto del job durante 7 días.
