# Pendientes y próximos pasos

Última actualización: 2026-10-22, contrastada con el repo (`origin/main` en `3bb4615`, PR #15). No hay ramas de trabajo abiertas con código sin mergear; el `main` **local** puede estar atrás: `git checkout main && git pull`.

> **2026-10-16:** `specs/` y `steering/` se movieron a `.claude/specs/` y `.claude/steering/`. Las rutas `specs/...` del texto histórico de abajo ahora son `.claude/specs/...`. Las secciones 1, 2, 3 y 5 son registro de lo que pasó en su momento; el estado vigente es la sección 3b.

## 1. Estado de las ramas (revisar primero)

> **2026-10-13:** el usuario confirmó que las secciones 1 (ramas y merge) y 2 (manuales de `orders-integrity` y `catalog-access`) están completas. El detalle original se deja abajo como registro.
>
> **2026-10-22:** `fix/orders-integrity`, `fix/catalog-access` y `fix/infra-hardening` están mergeadas en `main` (PR #4, #5, #6 y #7) y ya no existen como ramas. Las ramas locales que quedan (`refactor/*`, `feat/profile-and-images`, `docs/*`) están mergeadas y se pueden borrar con confirmación.

| Rama | Estado |
|---|---|
| `origin/main` | Ya incluye `fix/security-hardening` (Fase 1) y el formulario de contacto. El `main` **local** está 1 commit atrás: `git pull` antes de empezar. |
| `fix/orders-integrity` | Solo local (no está en el remoto). Sus commits (`1e6e9b6`, `1f25508`) ya están dentro de `fix/catalog-access`. |
| `fix/catalog-access` | Subida al remoto en `af1dfaa`. Contiene `orders-integrity` **y** `catalog-access`. |

- **Falta decidir el merge.** `fix/catalog-access` acumula las dos specs; se puede abrir un solo PR hacia `main` o partirlo en dos. No sé si ya hay un PR abierto: `gh` no está autenticado en esta máquina (`gh auth login`).
- Antes de mergear: el catálogo público solo va a mostrar `PUBLISHED` (ver sección 2).

## 2. Manuales que bloquean el cierre de las specs (los hace una persona)

### `orders-integrity`
- [ ] **Tarea 15, chequeo previo al despliegue.** Contra producción, solo lectura:
  - `SELECT count(*) FROM products WHERE stock < 0;` (si es mayor que 0, confirmar que normalizar a 0 es aceptable)
  - `SELECT count(*) FROM products WHERE price >= 1e10 OR price < 0;` (debe dar 0)
  - `SELECT count(*) FROM order_items WHERE unit_price >= 1e10;` (debe dar 0)
  - Confirmar que hay un backup reciente antes de aplicar la migración. Anotar los resultados en `.claude/specs/orders-integrity/tasks.md`.
- [ ] **UI del panel de órdenes en el navegador:** pasar un pedido `PENDING_PAYMENT` → `PAID` → cancelar, comprobar que no queda ningún botón y provocar un 409 cambiando el estado desde otra pestaña.

### `catalog-access`
- [ ] **Tarea 19, chequeo previo al despliegue.** En producción: `SELECT status, count(*) FROM products GROUP BY status;` y **publicar a mano** (`status = 'PUBLISHED'`) los `DRAFT`/`ARCHIVED` que deban seguir visibles. Después del despliegue el catálogo público solo muestra `PUBLISHED`. Anotar el resultado en `.claude/specs/catalog-access/tasks.md`.
- [ ] **UI del home en el navegador** (con el backend local y más de 12 productos publicados): "Cargar más", una búsqueda y su combinación con una categoría.
- [ ] Avisar que `GET /products` cambió de arreglo a `{items,total,page,limit,totalPages}`: cualquier cliente que no sea este frontend tiene que adaptarse.

## 3. `infra-hardening` (tercera spec de la Fase 2): desplegada en producción, falta 1 comprobación

Spec en `.claude/specs/infra-hardening/` (requisitos, diseño y tareas aprobados; las 14 tareas obligatorias hechas y el cierre escrito). Mergeada en `main` con el PR #5 (seguimiento de CI en los PR #6 y #7).

**Qué quedó hecho:** `validateEnv` al arrancar (sale con código 1 y lista todo lo que falta o está mal), CORS sin comodín en producción, Swagger apagado en producción, backend `USER node`, frontend `nginx-unprivileged` en el 8080, compose sin puertos publicados más `docker-compose.dev.yml` en loopback, `uploads/` fuera de git y de la imagen, `aide` eliminada.

**Estado en producción (2026-10-13):** backend y frontend corren `sha-c72c55b`, `healthy`; `/`, el SPA y `/api/health` dan 200 y `/api/docs` da 404. El primer intento del CI falló y volvió solo atrás porque `JWT_SECRET` tenía 14 caracteres (se rotó). Detalle en `.claude/specs/infra-hardening/tasks.md`, sección "Despliegue en producción".

**Todavía sin comprobar (lo hace una persona):**
- [ ] Que el puerto 5433 del servidor no responda desde fuera.

> **Confirmado el 2026-10-13:** la subida de una imagen desde el panel funciona (el `chown` del volumen quedó aplicado) y el PR #4 de `web-stack` (`fix/catalog-frontend-8080`) está mergeado en `master` (el usuario confirmó que `web-stack` está actualizado).

**Abierto fuera de alcance (anotado):** `CORS_ORIGIN` por defecto del compose es `http://localhost:8080`; el real lo define `web-stack`. El deploy sigue entrando por SSH como `root@`. Opcionales T15 (verificar `USER node` en el CI) y T16 (`npm audit` informativo) hechos en `ci.yml` y mergeados (commit `3abcf04`, PR #6); después `quality-baseline` volvió bloqueante el audit crítico. `npm audit` reporta vulnerabilidades preexistentes (backend: 24, 1 crítica; frontend: 15, 2 críticas): candidato para la Fase 3.


## 3b. Plan completo de la auditoría: lo que sigue después de la Fase 2

Origen: la auditoría del 2026-10-12. El informe y el plan por fases están en `C:\Users\Escequiel\.claude\plans\necesito-que-audites-toda-noble-candle.md` (fuera del repo). Estado de cada fase:

| Fase | Contenido | Estado |
|---|---|---|
| 0 y 1 | Seguridad crítica (reset sin token, `/users` sin guards, filtración de tokens, contraseñas, throttling) | Hecha. Commit `aef1d67`, ya en `origin/main` |
| 2 | Integridad del negocio | Hecha y desplegada (`orders-integrity`, `catalog-access`, `infra-hardening`). Solo queda comprobar a mano que el puerto 5433 no responda desde fuera (sección 3) |
| 3 | Arquitectura y calidad | En curso: `quality-baseline`, `frontend-cleanup` (PR #12) y `profile-and-images` (PR #14) cerradas y mergeadas en `main`; `backend-architecture` mergeada (PR #10 y #11) con el cierre de criterios del `spec-verifier` escrito; el 2026-10-22 se reprodujeron REQ-1.8, 3.3 y 3.6; REQ-3.2 (e2e) queda no verificado; falta el despliegue manual para tildar T10 |
| 4 | Features para el e-commerce | Pendiente (abajo) |

### Fase 3, spec 1: `quality-baseline` (cerrada el 2026-10-13)

Spec en `.claude/specs/quality-baseline/`, desplegada y comprobada en producción (según informó el usuario). Hecho: tests unitarios del backend y de Karma en verde, lint del backend en 0, CI bloqueante (lint, tests, audit crítico), vulnerabilidades de producción resueltas (backend: 0 altas ni críticas; frontend: 0). Cierre de criterios en `tasks.md`. **Siguientes de la Fase 3:** `backend-architecture` y `frontend-cleanup`.

**Abierto tras esta spec (anotado):**
- **`npm audit` solo de desarrollo o con salto mayor.** Backend: 21 moderadas (cadena de `jest` / `@istanbuljs`; 2 de producción: `@nestjs/swagger` → `js-yaml` 5.x, sin arreglo compatible hoy). Frontend (solo `devDependencies`): 6 altas: `karma`, `karma-jasmine`, `karma-jasmine-html-reporter`, `braces`, `chokidar` (`npm audit` propone bajar a `karma@4`, que es un salto mayor hacia atrás: no sirve) y `@angular/build` (propone 19.x, también hacia atrás). Revisar cuando salgan versiones nuevas de esos paquetes.
- **Angular fijado en versión exacta** (`"@angular/core": "20.3.33"`, etc.): `npm audit fix` no los mueve y `npm install` da ERESOLVE por peers; la actualización se hace editando `package.json` y corriendo `npm install --legacy-peer-deps`. Candidato a Renovate/Dependabot (T18 de la spec).
- ~~`UsersService.create` y `findOne` devuelven el hash de la contraseña~~ **(nota errónea, corregida el 2026-10-13):** el hash no sale por HTTP, porque `User.password` tiene `@Exclude()` y `app.setup.ts` aplica `ClassSerializerInterceptor` (lo prueba `auth-dto.security.spec.ts`). Sí es cierto que los controllers devuelven entidades de TypeORM y que dependen de ese mecanismo: los DTOs de respuesta explícitos siguen siendo una mejora pendiente (ver Fase 3).
- **`backend/test/app.e2e-spec.ts`** sigue fallando (espera `GET /` → `Hello World!`): test de scaffold; borrar o reescribir al hacer la spec de e2e en el CI.
- **Las 11 suites e2e no corren en el CI** (hoy corren a mano con Postgres descartable): candidato a spec propia.
- ~~**Bundle inicial del frontend**: 882 kB, sobre el presupuesto de 800 kB~~ (resuelto en `frontend-cleanup`: 794,70 kB con el admin cargado perezosamente; margen de ~5 kB).

### Fase 3, spec 2: `backend-architecture` (mergeada en `main`, falta confirmar T10 a mano)

Spec en `.claude/specs/backend-architecture/`. Mergeada con los PR #10 y #11 (commits `42b1b00`, `0c11115`, `f206ce6`, `9af1032`; `e4cd3cf` escribe el cierre de criterios con el `spec-verifier`). Pendiente (T10 sigue sin tildar en `tasks.md`): el despliegue manual (health, login, alta con imagen, pedido y envío de contacto). El 2026-10-22 se reprodujeron REQ-1.8 (401 sin token), REQ-3.3 (Swagger idéntico) y REQ-3.6 (`/health` 200, `uid=1000`); **REQ-3.2 queda no verificado por decisión del usuario**: las e2e en serie se colgaron dos veces contra un Postgres descartable (causa sin investigar; quizá una suite que deja un handle abierto). Los volúmenes `archsmoke_*` ya no existen. Opcionales sin hacer (verificado en el repo: `mail.controller.ts` sigue existiendo y `tasks.md` los deja sin tildar): T11 (borrar `MailController`) y T12 (regla de lint contra imports de adaptadores). Hecho: `@CurrentUser()` en `cart`, `favorites`, `orders`, `product` y `category`; puertos `MailSender`, `ImageStorage` y `AiContentGenerator` con su adaptador; `AuthenticatedRequest` eliminado; 36 pruebas nuevas (344 en total). Swagger idéntico byte a byte antes y después.

**Abierto del backend (sin spec todavía):**
- **DTOs/presenters de respuesta:** los controllers devuelven entidades de TypeORM y dependen de `@Exclude()` + `ClassSerializerInterceptor` para no filtrar campos.
- **Repositorios por contexto y reglas de dominio** (límite de demo, transiciones de orden) fuera de los services; empezar por `ordering` e `identity`.
- **`MailController`** está vacío (código muerto).
- **El puerto no pertenece al consumidor:** viven en el módulo del adaptador. Revisar si aparece un segundo adaptador.
- **`login`** sigue con `@Request() req: { user: User }` (usuario de la estrategia `local`, no el `Payload`).

### Fase 3, spec 3: `frontend-cleanup` (cerrada y mergeada en `main`, PR #12)

Spec en `.claude/specs/frontend-cleanup/`. Rama `refactor/frontend-cleanup`. Hecho: servicios de catálogo de lectura pública en `core/data-access`; `AuthStore` como única fuente de la sesión (único lugar con `localStorage` de sesión, con validación al rehidratar); `OnPush` en los 33 componentes y `Profile` con signals; código muerto borrado (`postItems()`, selector `app-header` de `HomePage`); admin con `loadComponent` y bundle bajo el presupuesto; ESLint 9 en el frontend (`npm run lint`, en el CI antes de los tests) con la regla que exige `OnPush`; 172 tests de Karma. SSR quedó fuera de alcance. T20 (humo manual) hecho el 2026-10-19 y tabla de cierre completa. Mergeada con el PR #12 y su cierre de T20 con el PR #13.

**Abierto del frontend (anotado, fuera de la spec):**
- **Hallazgos del humo manual (2026-10-19):** resueltos por la spec `profile-and-images` (guardar perfil, feedback y reglas de imagen, vista previa al crear un producto).
- **Providers duplicados** entre `src/main.ts` (con zone.js, es el que arranca el navegador) y `app.config.ts` (zoneless, usado por SSR): hay que unificarlos o decidir SSR.
- `LoginResponse.user.id` está tipado con el literal `1` y sin `role`.
- La columna «Categorías» de la tabla de productos del admin lee `row.categoryIds`, que no existe en `ProductResModel`: probablemente siempre muestra «-».
- `AuthStore.loadingProfile` se escribe pero nadie lo lee.
- **Login con perfil caído** (`AuthFacade.login`): si `getUserById` falla tras un login correcto, la sesión queda guardada en el store y en `localStorage`, pero la UI dice «Credenciales inválidas». Hacer `store.clear()` en ese caso y agregar test.
- **Diálogos de producto y categoría:** `uploadImageForEntity` y `deleteImageFromEntity` relanzan errores que, llamados desde la plantilla, terminan como promesas rechazadas sin manejar (`Profile` ya lo corrigió en T17).
- **`role` de `userLite` sin validar** en `AuthStore.rehydrate()`: un valor editado a mano habilita el menú y las rutas de admin en el cliente (el backend protege con `@Roles`, así que es solo UX). Validar contra `ADMIN | CLIENT | GUEST`; considerar a la vez la expiración del token (Fase 4).
- Si el bundle vuelve a pasar de 800 kB: T11/T12 de la spec (carga perezosa de login/registro, carrito, checkout y perfil).

### Fase 3, spec 4: `profile-and-images` (cerrada y mergeada en `main`, PR #14)

Spec en `.claude/specs/profile-and-images/`. Rama `feat/profile-and-images`, desde `origin/main`. Cierra los tres hallazgos del humo manual de `frontend-cleanup` (2026-10-19), todos preexistentes: (1) el perfil no se podía guardar («Guardar» no tenía handler); (2) imagen inválida sin feedback ni reglas visibles; (3) sin vista previa al crear un producto con imagen, y producto o categoría duplicados si la subida fallaba tras crear. **Hecho (solo frontend):** guardar/cancelar en `Profile` con validación sin espacios; `shared/utils/image-rules.ts` (JPG, PNG o WebP, 5 MB) con rechazo en el cliente y mensajes por 413 y 415; vista previa en el panel «Vista previa del producto»; aviso único y paso a modo edición si la imagen falla tras crear (producto y categoría), sin duplicados; 138 tests nuevos (310 en total). `Profile` se carga de forma perezosa (el bundle inicial bajó de 799,15 a 764,37 kB). Humo manual informado como «todo ok» por el usuario y CI en verde; cerrada el 2026-10-19.

**Abierto tras esta spec (anotado):**
- ~~**Análisis con IA antes de guardar el producto**~~ **Hecho en la spec `ia-al-crear-producto` (2026-10-22):** el análisis de imagen se hace con un endpoint nuevo `POST /products/analyze-image` que recibe el archivo por `multipart` y lo analiza en memoria, sin carpeta temporal. Queda abierta la **subida previa de la imagen a una carpeta temporal** (ya no hace falta para la IA; solo tendría sentido para otros usos).
- Los límites de imagen son una constante del frontend (`image-rules.ts`) que debe igualar `MAX_IMAGE_SIZE_BYTES` del backend; si ese valor cambia en un despliegue, hay que tocar las dos.
- Escape y clic en el fondo del diálogo se bloquean (`disableClose`) solo después de crear con fallo de imagen; no tienen test automático.
- `NFR-8` (ruta `profile` con `loadComponent`) no tiene test automático: lo cubren el `grep` y el build.
- **Deuda de la auditoría de `profile-and-images` (M3 y M5, decidida por el usuario el 2026-10-19):** (M3) `disableClose` se activa recién cuando la subida falla; mientras corre la creación o la subida posterior, Escape o el clic en el fondo cierran el diálogo con `undefined` y la lista no se refresca; (M5) `ImageFieldComponent.clearSelection()` no vacía el `<input type="file">`: tras «Quitar» no se puede volver a elegir el mismo archivo.
- Si `.claude/steering/structure.md` debe mencionar `shared/utils/image-rules.ts`: decisión del usuario.

### Mejora: `ia-al-crear-producto` (implementada, sin commitear, falta el humo manual)

Spec en `.claude/specs/ia-al-crear-producto/`. Rama `feat/ia-al-crear-producto`, desde `main` `c84fc73`. **Hecho:** «Analizar imagen con IA» se habilita al crear un producto con solo elegir la imagen (antes exigía una imagen ya subida). Backend: endpoint nuevo `POST /products/analyze-image` (`multipart`, `file` + `categories` como JSON), en memoria y sin escribir en `uploads/`, con los guards y el tope de IA de `generate-from-image` y topes propios (un archivo, un campo de texto de hasta 64 KB, hasta 200 categorías); la imagen viaja a OpenAI como `data:` URL, así que también funciona en `localhost`. Frontend: `ProductService.analyzeImageFile` y `PrdFormComponent` (archivo elegido en un signal, análisis por URL o por archivo según lo disponible, guardado bloqueado mientras se analiza). Backend 421 tests y frontend 336 en verde; bundle 764,54 kB. Swagger: solo se agrega el endpoint nuevo.

**Abierto tras esta spec (anotado):**
- **Humo manual con OpenAI real (T16):** lo hace una persona con `OPENAI_API_KEY` válida (crear producto → elegir imagen → analizar → guardar; probar también un archivo de más de 5 MB y uno que no sea imagen).
- **Edición con imagen ya subida y archivo local nuevo sin subir** (si el usuario rechaza el reemplazo): se analiza la imagen subida, no el archivo local. Estado raro y transitorio.
- Si el componente se destruye con el diálogo de confirmación de sugerencias ya abierto, ese diálogo no se cierra (solo se evitan los avisos posteriores).
- Los topes `files/fields/parts/fieldSize` solo se aplican al endpoint nuevo; las subidas a disco (`/:id/image`) siguen sin límites de campos de texto.
- Los límites de imagen siguen duplicados entre `image-rules.ts` y `MAX_IMAGE_SIZE_BYTES` del backend (ya anotado en `profile-and-images`).

### Hallazgos de la prueba local (2026-10-22, informados por el usuario)

Salieron probando la pila en local mientras se cierra T10 de `backend-architecture`. Sin investigar todavía; el resto de las funcionalidades probadas anda sin problema.

**Errores:**
- ~~**Crear una categoría con imagen da error.**~~ **Descartado (2026-10-22): no era un bug.** El error de la consola era `POST http://localhost:3000/categories net::ERR_CONNECTION_REFUSED`: el backend no estaba escuchando en ese momento (se había apagado el proceso de `npm run start:dev`). Con el backend arriba, el usuario confirmó que la categoría y el producto se crean con imagen de una sola vez. El backend también se probó aparte con el mismo flujo del frontend (crear con `imageUrl: null` y subir la imagen: 201 y 201).
- ~~**Al crear un producto nuevo y cargarle la imagen, las opciones de autocompletado con IA no quedan habilitadas**~~ **Resuelto por la spec `ia-al-crear-producto`** (rama `feat/ia-al-crear-producto`, sin commitear a la fecha): «Analizar imagen con IA» se habilita al elegir la imagen en el alta. Falta el humo manual con OpenAI real (T16).

**Posibles mejoras (UX, sin spec):**
- Mejorar el filtro del catálogo para permitir **varias categorías a la vez** (hoy es una sola).
- Que **crear y editar producto y categoría sean una página** (ruta propia) y no una ventana emergente. Tocaría `catalog-admin` y simplificaría el manejo de `disableClose` (M3 de `profile-and-images`).

### Fase 3: arquitectura y calidad (resto, pendiente)
- ~~Decorador `@CurrentUser()`~~ (hecho en `backend-architecture`). Quedan los presenters / DTOs de respuesta, para dejar de devolver entidades por HTTP. (El mapper único de órdenes ya se hizo en `orders-integrity`.)
- ~~Puertos `MailSender`, `ImageStorage`, `AiContentGenerator`~~ (hechos en `backend-architecture`). Quedan los repositorios por contexto y mover las reglas (límite demo, transiciones de orden) al dominio. Empezar por `ordering` e `identity`.
- ~~Arreglar los tests y el lint y sacar `continue-on-error` del CI~~ (hecho en `quality-baseline`). El CI es bloqueante; solo quedan con `continue-on-error` los dos `npm audit --omit=dev` informativos, a propósito.
- Frontend:
  - ~~Servicios de catálogo a `core/data-access`~~, ~~una sola fuente de verdad para la sesión~~, ~~`OnPush` y `Profile` con signals~~ y ~~código muerto~~ (hechos en `frontend-cleanup`; ver arriba).
  - Decidir SSR: activarlo en `home` y `product/:slug` para SEO, o eliminarlo (sacado de `frontend-cleanup`).

### Fase 4: features del e-commerce (pendiente)
- **Imprescindibles:**
  - Pasarela de pago (Mercado Pago Checkout Pro + webhook firmado), para que la orden pase a `PAID` sola.
  - "Mis pedidos" del cliente (`GET /orders/me` y su página).
  - Emails transaccionales (orden creada, pago confirmado, enviada).
  - Carrito anónimo persistente que se fusiona al loguearse.
  - Orden (sort) del catálogo en el servidor: paginación, búsqueda y categoría ya están.
  - Refresh token en cookie `httpOnly`, logout real y cambio de contraseña desde el perfil.
- **Muy recomendables:**
  - Envío (costo por zona o retiro, libreta de direcciones).
  - Varias imágenes por producto, y slug y SKU únicos con constraint.
  - Imágenes en S3 o R2 con CDN.
  - SEO (SSR o prerender, Open Graph, `sitemap.xml`).
  - Panel admin con métricas y auditoría.
  - Observabilidad (logger estructurado, Sentry, `/health` que verifique la base, backups de Postgres).
- **Nice to have:** cupones, reseñas, aviso de vuelta de stock, variantes, exportar órdenes a CSV.

### Seguridad del informe que sigue sin cubrir
- **SSRF y prompt injection en la IA:** `generate-from-image` manda a OpenAI cualquier `imageUrl`, y `generate-ai/:name` permite inyectar prompts. `catalog-access` solo agregó el tope de uso.
- JWT de 6 días, sin refresh ni revocación y con el rol embebido; el token vive en `localStorage`.
- `register` responde 409 si el email existe (enumeración de usuarios).
- Uploads: se valida el MIME que declara el cliente, no los magic bytes.
- El deploy entra por SSH como `root@` (repo `web-stack` y pipeline de `ci/docker-ghcr`).
- Reset de contraseña: no invalida las sesiones previas.

## 4. Backlog por spec (fuera de alcance, anotado para decidir después)

### De `orders-integrity`
- Pasarela de pago y confirmación automática de pagos (hoy: transferencia y el admin marca la orden como pagada).
- Cancelación de la orden por parte del cliente.
- Emails de orden creada, pagada o cancelada.
- Paginación del listado de órdenes del admin.
- Qué hacer con la columna `reserved_stock` (hoy no la usa nadie).

### De `catalog-access`
- `PUT /products/:id/publish` no cambia el estado (solo comprueba al dueño y devuelve el producto). Decidir si debe publicar de verdad y si un ADMIN puede publicar productos ajenos.
- El límite de demo "un GUEST no puede tener más de 5 productos/categorías" cuenta **toda** la tabla, no solo lo del GUEST.
- Paginar `GET /users/:id/products`, categorías y favoritos.
- Búsqueda: ranking, búsqueda por SKU o por nombre de categoría. Hoy es `ILIKE '%…%'` sin índice (revisar con `pg_trgm` o `tsvector` si el catálogo crece a miles).
- Paginación por cursor `(createdAt, id)` en lugar de offset, si molesta el producto repetido al publicar entre páginas.
- Vista previa pública de un borrador para su dueño.
- Contador del tope de IA compartido entre instancias (Redis); hoy vive en memoria.
- Un DTO de respuesta explícito para categorías (hoy `update` descarta el dueño con un `delete`).
- Ver el `401` real (no el `403` del arnés) de "sin sesión" en las suites: el guard JWT está reemplazado en los tests.

## 5. Deuda de tests y lint (preexistente, no la introdujeron estas specs)

> **2026-10-16:** resuelta por `quality-baseline` (tests y lint en verde, CI bloqueante), salvo `test/app.e2e-spec.ts`, el bundle sobre 800 kB y las suites e2e fuera del CI (ver sección 3b). Se deja como registro.

- **Backend, suites unitarias que fallan:** `openai.service`, `mail.service`, `auth.service`, `auth.controller`, `users.service`, `users.controller` (5 tests). Más `test/app.e2e-spec.ts`.
- **Frontend, tests que fallan (5):** `App` ×2, `AuthFacade`, `LoginForm`, `Profile`. Causas visibles: falta `provideHttpClient` / Zone.js en la configuración de esos specs.
- **Lint:** `'_imageUrl'` en `category.service.ts` y `'_thumbnailUrl'` en `product.service.ts` (variables sin usar en destructuring).
- **Frontend:** el build avisa que el bundle inicial supera el presupuesto de 800 kB (875 kB).
- Las suites de integración hay que correrlas **en serie** (`npx jest --config test/jest-e2e.json --runInBand`) y con la base descartable (`docker run … postgres:16-alpine`, variables `TEST_DB_*`); en paralelo se pisan los datos.

## 6. Cómo retomar mañana

1. `git checkout main && git pull` (el local suele quedar atrás).
2. Cerrar lo manual que queda: T10 de `backend-architecture` y el puerto 5433 de `infra-hardening` (sección 3).
3. Si se sigue con código: lo abierto de la Fase 3 (3b: DTOs de respuesta, repositorios por contexto, deuda del frontend, SSR) o arrancar la Fase 4, siempre con `sdd-flow`.
4. El plan completo de la auditoría (Fases 3 y 4) está en la sección 3b y en `C:\Users\Escequiel\.claude\plans\necesito-que-audites-toda-noble-candle.md`.
5. Material de estudio de la sesión: `C:\Programs\wiki-claude\sesiones\2026-10-12-catalog-access.html`.
