# Tareas: catalog-access

Convenciones:
- Rama de trabajo: `fix/catalog-access` (parte de `fix/orders-integrity`, que ya tiene `orders-integrity` y la Fase 1).
- Comandos del backend desde `backend/`; del frontend desde `frontend/`. "Tests de integración" = `npx jest --config test/jest-e2e.json <archivo>` con la base de pruebas levantada (contenedor efímero: `docker run -d --name orders-it-pg -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=orders_it -p 55432:5432 postgres:16-alpine`, con las variables `TEST_DB_*`; **no** usar el servicio `db` del compose: monta el volumen con los datos de desarrollo). El arnés es el de `orders-integrity` (`test/orders-integrity.helpers.ts`).
- Las suites de integración comparten una sola base: correrlas **siempre en serie** (`--runInBand`); en paralelo se pisan los datos y fallan.
- Tests del frontend: `npx ng test --watch=false`.
- Los commits se hacen solo cuando el usuario lo pida.
- Todas las tareas son **obligatorias** salvo las marcadas como opcionales.
- Las suites de scaffold viejas siguen fallando como antes y no se arreglan aquí: en el backend 6 suites unitarias (`openai.service`, `mail.service`, `auth.service`, `auth.controller`, `users.service`, `users.controller`) y `test/app.e2e-spec.ts`; en el frontend 5 tests (`App` x2, `AuthFacade`, `LoginForm`, `Profile`).

**Grafo de dependencias (resumen):** 2, 3, 4, 5 y 16 son piezas independientes entre sí y de 1. 6 depende de 4 y 5. 7 y 8 son independientes de todo (se pueden hacer en paralelo con las piezas). 9 depende de 2. 10 depende de 3. 11 depende de 1. 12 depende de 6 y 11. 13 depende de 9 y 11. 14 depende de 7, 8 y 11. 15 depende de 10 y 11. 17 depende de 16. 18 es independiente. 19 es manual y se hace antes de desplegar. 20 cierra la spec y depende de todas.

---

## Base

- [x] 1. Preparar rama, configuración y helper de siembra
  - Detalle: crear `fix/catalog-access` desde `fix/orders-integrity`; agregar `AI_RATE_LIMIT` y `AI_RATE_TTL_SECONDS` (opcionales, `number`) a `backend/src/env.model.ts`, comentadas con el default en `backend/.env-example` y en el `.env-example` de la raíz, y pasarlas en el servicio `backend` de `docker-compose.yml` (`${AI_RATE_LIMIT:-20}`, `${AI_RATE_TTL_SECONDS:-3600}`); agregar un `status?: Status` opcional (default `PUBLISHED`) a `seedProduct` en `test/orders-integrity.helpers.ts`.
  - Depende de: —
  - Verificación: `npm run build` sin errores; `docker compose config` en la raíz no marca error; `npx jest --config test/jest-e2e.json test/orders-integrity.e2e-spec.ts` sigue verde con la base arriba (el cambio del helper no rompe lo existente).
  - _Requisitos: REQ-5.5 (variables), preparación de REQ-1 a REQ-4_

## Piezas puras (independientes entre sí)

- [x] 2. Regla de propiedad
  - Detalle: crear `src/common/ownership.ts` con `canModify(actor, ownerId)` según el diseño.
  - Depende de: —
  - Verificación: `src/common/ownership.spec.ts` verde: ADMIN con cualquier dueño (incluido `null`) → `true`; GUEST con `ownerId === sub` → `true`; GUEST con otro dueño → `false`; GUEST con `ownerId` `null` o `undefined` → `false`; `CLIENT` dueño → `true` (la regla es solo de propiedad; el rol lo filtra `RolesGuard`).
  - _Requisitos: REQ-3.1 a 3.4_

- [x] 3. Lectura de la configuración del tope de IA
  - Detalle: crear `src/ai/ai-rate-limit.config.ts` con `readPositiveInt(raw, fallback)` → `{ value, valid }`.
  - Depende de: —
  - Verificación: `src/ai/ai-rate-limit.config.spec.ts` verde: `undefined` → fallback con `valid: true` (sin advertencia); `'30'` y `30` → 30; `'0'`, `'-5'`, `'abc'`, `'2.5'`, `''`, `NaN` → fallback con `valid: false`.
  - _Requisitos: REQ-5.5, REQ-5.6_

- [x] 4. DTO de consulta del listado
  - Detalle: crear `src/product/dto/list-products-query.dto.ts` con `page`, `limit`, `search`, `categoryId` según el diseño.
  - Depende de: —
  - Verificación: `src/product/dto/list-products-query.dto.spec.ts` (con `ValidationPipe` igual al de `main.ts`) verde: sin parámetros → `page 1`, `limit 12`; rechaza `limit=51`, `limit=0`, `limit=1.5`, `limit=abc`, `page=0`, `page=-1`, `page=1.5`, `categoryId=0`, `categoryId=abc`, `search` de 101 caracteres y un parámetro desconocido; acepta `limit=50` y `search` de 100 caracteres; `search='  '` queda sin definir y `search=' tecl '` queda `'tecl'`.
  - _Requisitos: REQ-2.2, REQ-2.3, REQ-2.5, REQ-2.7_

- [x] 5. Escape de comodines de `LIKE`
  - Detalle: crear `src/common/escape-like.ts` con `escapeLike(text)`: antepone `\` a `\`, `%` y `_`.
  - Depende de: —
  - Verificación: `src/common/escape-like.spec.ts` verde: `'50%'` → `'50\\%'`, `'a_b'` → `'a\\_b'`, `'a\\b'` → `'a\\\\b'`, `'teclado'` sin cambios, cadena vacía → vacía.
  - _Requisitos: REQ-2.4_

## Backend: visibilidad y listado

- [x] 6. Listado paginado y lecturas públicas solo `PUBLISHED`
  - Detalle: en `ProductService` agregar `findPublicPage` (reemplaza a `findAll`), `findPublishedById` y `findPublishedByUserId`; filtrar por `PUBLISHED` en `findOneBySlug` y `findProductByCategoryId` (eliminando su `if (!product)` muerto); modelo `ProductPage` en `src/product/models/product-page.model.ts`. En `ProductController`: `findAll` recibe `@Query() ListProductsQueryDto`; `GET :id` usa `findPublishedById`; `GET user/:id` usa `findPublishedByUserId`. Verificar con `grep` que nada más llama a `ProductService.findAll`/`findOne` como lectura pública.
  - Depende de: 4, 5
  - Verificación: `npm run build` verde; unit `src/product/services/product.service.spec.ts` (repositorio simulado) verde: `totalPages = ceil(total/limit)` y `0` si `total = 0`; `escapeLike` aplicado al `search`; `findOneBySlug` pasa `status: PUBLISHED` al `where`. La verificación de comportamiento completa queda en la tarea 12.
  - _Requisitos: REQ-1.1 a 1.4, REQ-2.1, REQ-2.4, REQ-2.6, REQ-2.8 a 2.12_

- [x] 7. Favoritos solo con productos publicados
  - Detalle: `FavoritesService.add` agrega `status: PUBLISHED` al `findOne` del producto; `findAllByUser` filtra por `product: { status: PUBLISHED }`.
  - Depende de: —
  - Verificación: `src/favorites/favorites.service.spec.ts` (repositorios simulados) verde: agregar un producto `DRAFT`/`ARCHIVED` (el `findOne` con `status` no lo encuentra) → `NotFoundException` y no se guarda nada; el listado pasa el `where` con `product.status = PUBLISHED`.
  - _Requisitos: REQ-1.5, REQ-1.6_

- [x] 8. Carrito y checkout rechazan productos no publicados
  - Detalle: `CartService.upsertItem` agrega `status: PUBLISHED` al `findOne` del producto (el 404 existente cubre el rechazo); `OrdersService.createOrder` agrega, en el bucle de validación y antes de la comprobación de precio, `if (product.status !== Status.PUBLISHED) throw new BadRequestException(\`Product ${product.name} is not available\`)`. `findAllByUser` y `removeItem` quedan sin cambios.
  - Depende de: —
  - Verificación: `src/cart/cart.service.spec.ts` ampliado, verde: producto no publicado → 404 y `cartRepository.save` no se llama; `findAllByUser` sigue listando el ítem de un producto no publicado. La verificación de `createOrder` queda en la tarea 14 (integración).
  - _Requisitos: REQ-4.1, REQ-4.2, REQ-4.3_

## Backend: propiedad y tope de IA

- [x] 9. Propiedad en productos y categorías
  - Detalle: `ProductService.update | remove | uploadImage | deleteImage` y `CategoryService.update | remove | uploadImage | deleteImage` reciben `actor: Payload`; cada uno busca primero con `findOwnedProduct`/`findOwnedCategory` (404; `relations: ['user']` en categorías) y lanza `ForbiddenException` si `!canModify`. En `uploadImage` de ambos, si el chequeo falla, borrar el archivo recién subido con `deleteByPublicPath(buildPublicPath(folder, filename))` antes de relanzar. Los dos controladores agregan `@Request() req` y pasan `req.user as Payload`; los `@Roles('ADMIN', 'GUEST')` no cambian.
  - Depende de: 2
  - Verificación: `npm run build` verde; unit `product.service.spec.ts` / `category.service.spec.ts` ampliados: GUEST ajeno → `ForbiddenException` y ni `save`, ni `delete`, ni `deleteByPublicPath` del recurso se llaman; GUEST dueño y ADMIN → se ejecuta; inexistente → `NotFoundException`; categoría sin dueño con GUEST → 403 y con ADMIN → se ejecuta; en `uploadImage` rechazado se borra el archivo subido. El comportamiento por HTTP queda en la tarea 13.
  - _Requisitos: REQ-3.1 a 3.5, REQ-3.7_

- [x] 10. Guard del tope de IA
  - Detalle: crear `src/ai/ai-throttler.guard.ts` (`getTracker` por `sub`, `generateKey` sin handler); importar en `ProductModule` `ThrottlerModule.forRootAsync` con un throttler `ai` (`limit`/`ttl` desde `readPositiveInt`, `Logger.warn` si `valid` es `false`) y `errorMessage` en español; aplicar `@UseGuards(AuthGuard('jwt'), RolesGuard, AiThrottlerGuard)` a `generateAi` y `generateFromImage`.
  - Depende de: 3
  - Verificación: `src/ai/ai-throttler.guard.spec.ts` verde: el tracker es `user:<sub>`; la clave es la misma para dos handlers distintos del mismo usuario y distinta para otro usuario; la llamada 21 del mismo usuario (con límite 20, repartida entre ambos handlers) lanza 429; otro usuario sigue pasando; con variable inválida el módulo usa 20/3600 y registra la advertencia. `npm run build` verde. El comportamiento por HTTP queda en la tarea 15.
  - _Requisitos: REQ-5.1 a 5.7_

## Pruebas de integración (HTTP, Postgres real)

- [x] 11. Arnés HTTP del catálogo
  - Detalle: crear `test/catalog-access.helpers.ts` con `createCatalogTestModule()`: módulo Nest real (`ProductModule`, `CartModule`, `FavoritesModule`, `OrdersModule`, `UsersModule`) contra la base de pruebas con migraciones, `AuthGuard('jwt')` sobrescrito con el guard de header `x-test-user` del arnés existente, `OpenaiService` reemplazado por un doble que cuenta llamadas, y una app HTTP con el mismo `ValidationPipe` de `main.ts` **más** `ClassSerializerInterceptor`. Helpers de siembra de categorías (`seedCategory(dataSource, { userId | null, name })`) y de relación producto–categoría. Si faltan las variables `TEST_DB_*`, las suites se omiten con aviso explícito (como en `orders-integrity`).
  - Depende de: 1
  - Verificación: `test/catalog-access.smoke.e2e-spec.ts` (humo): `GET /products` responde 200 con `{items,total,page,limit,totalPages}` sobre una base vacía; sin las variables, Jest informa la suite como omitida con el aviso (no un verde silencioso).
  - _Requisitos: NFR de pruebas (prepara las tareas 12 a 15)_

- [x] 12. Integración: visibilidad y paginación
  - Detalle: crear `test/catalog-visibility.e2e-spec.ts`.
  - Depende de: 6, 11
  - Verificación (HTTP): con productos `PUBLISHED`, `DRAFT` y `ARCHIVED` → `GET /products` solo los publicados (REQ-1.1); `GET /products/:id` y `/slug/:slug` de un `DRAFT`/`ARCHIVED` → 404 igual que un id inexistente (REQ-1.2); `GET /products/user/:id` solo publicados y `[]` con 200 si no tiene (REQ-1.3); `GET /categories/:id/posts` solo publicados (REQ-1.4); `GET /users/:id/products` del dueño y de un ADMIN devuelve los tres estados (REQ-1.7); ningún estado cambia tras recorrer todos los endpoints (REQ-1.8). Paginación: 30 publicados → defaults `page 1`, `limit 12`, `total 30`, `totalPages 3` (REQ-2.1, 2.2); orden `createdAt DESC, id DESC` y dos páginas consecutivas sin repetidos ni omitidos (REQ-2.9); `search` sin distinguir mayúsculas en nombre y descripción, `search=50%` y `search=a_b` no actúan como comodines (REQ-2.4); `categoryId` filtra y cada producto devuelto conserva **todas** sus categorías (REQ-2.6); `search` + `categoryId` combinados (REQ-2.8); `page` fuera de rango → 200, `items: []`, `total` real (REQ-2.10); sin coincidencias → `total 0`, `totalPages 0` (REQ-2.11); parámetros inválidos → 400 (REQ-2.3, 2.5, 2.7); el dueño de cada item llega solo con `id` y `profile.name/lastName/avatar`, sin email, rol ni contraseña (REQ-2.12). Si el `@Transform` del dueño no se aplica a las entidades anidadas, implementar el mapeo explícito del dueño en `findPublicPage` y repetir la prueba.
  - _Requisitos: REQ-1.1 a 1.4, 1.7, 1.8, REQ-2.1 a 2.12_

- [x] 13. Integración: propiedad
  - Detalle: crear `test/catalog-ownership.e2e-spec.ts`.
  - Depende de: 9, 11
  - Verificación (HTTP): para productos (`PUT`, `DELETE`, `POST|DELETE /:id/image`) y categorías (las mismas cuatro): GUEST sobre recurso ajeno → 403 y el recurso y el archivo intactos (REQ-3.1, 3.2, 3.7); en la subida rechazada no queda archivo huérfano en `uploads/`; GUEST sobre recurso propio → igual que hoy (REQ-3.3); ADMIN sobre recurso de cualquiera, incluida una categoría con `user_id` nulo → igual que hoy (REQ-3.4); id inexistente → 404 para ADMIN y GUEST (REQ-3.5); `CLIENT` → 403 y sin sesión → 401 (REQ-3.6).
  - _Requisitos: REQ-3.1 a 3.7_

- [x] 14. Integración: favoritos, carrito y checkout
  - Detalle: crear `test/catalog-cart.e2e-spec.ts`.
  - Depende de: 7, 8, 11
  - Verificación (HTTP): `PATCH /cart/items/:id` y `POST` a favoritos con un producto `DRAFT`/`ARCHIVED` → 404 sin crear nada (REQ-4.1, REQ-1.5); un producto archivado después de estar en el carrito sigue en `GET /cart` y se quita con `DELETE /cart/items/:id` (REQ-4.2); `POST /orders` con un producto archivado y otro publicado → 400 nombrando el producto, stock de ambos intacto, sin orden ni ítems y carrito conservado (REQ-4.3); con todos publicados → igual que antes (stock descontado, total, carrito vacío) (REQ-4.4); una orden ya creada con un producto que luego se archiva se lee igual (REQ-4.5); `GET` de favoritos omite los no publicados (REQ-1.6). Las suites de `orders-integrity` siguen verdes.
  - _Requisitos: REQ-1.5, 1.6, REQ-4.1 a 4.5_

- [x] 15. Integración: tope de IA
  - Detalle: crear `test/catalog-ai.e2e-spec.ts` con `AI_RATE_LIMIT=3` y `AI_RATE_TTL_SECONDS=3600` (variables del test).
  - Depende de: 10, 11
  - Verificación (HTTP, `OpenaiService` doble): 3 llamadas mezclando `generate-ai` y `generate-from-image` del mismo usuario → 200 (REQ-5.1, 5.3); la 4.ª → 429 con el mensaje en español y el doble de OpenAI **no** recibe la 4.ª llamada (REQ-5.2); otro usuario sigue recibiendo 200 (REQ-5.4); si el doble falla, la llamada igual cuenta (REQ-5.7); sin sesión → 401 y `CLIENT` → 403 sin consumir el tope de nadie (REQ-5.8); con `AI_RATE_LIMIT=abc` el límite efectivo es 20 y hay una advertencia en el log (REQ-5.5, 5.6).
  - _Requisitos: REQ-5.1 a 5.8_

## Frontend

- [x] 16. Servicio de productos paginado y tipos
  - Detalle: en `product.service.ts` (front) reemplazar `getAllProducts` por `getProductsPage(opts)` con `HttpParams` (omite `search` vacío y `categoryId` nulo) y exportar `ProductPage`; borrar el método muerto `getAllProducts()` de `product-list.component.ts`.
  - Depende de: —
  - Verificación: `product.service.spec.ts` (TestBed + `HttpTestingController`) verde: pide `/products` con `page`, `limit`, `search` y `categoryId` solo cuando están definidos; devuelve el objeto de página; `ng build` sin errores de compilación (nada más referencia a `getAllProducts`).
  - _Requisitos: REQ-6.1_

- [x] 17. Home con "Cargar más", búsqueda y categoría en el servidor
  - Detalle: reescribir la carga de `HomePage` según el diseño: signals `products`, `page`, `totalPages`, `total`, `loading`, `loadingMore`, `error`, `loadMoreError`; `reload()` y `loadMore()` con `requestSeq`; búsqueda con `debounceTime(300)` + `distinctUntilChanged`; categoría y "limpiar filtros" llaman a `reload()`; quitar `filteredProducts` y `searchTerm`; actualizar `home-page.html` (contador con `total()`, grilla con `products()`, botón "Cargar más" con estado deshabilitado/"Reintentar", estado vacío y error existentes).
  - Depende de: 16
  - Verificación: `home-page.spec.ts` (TestBed + `HttpTestingController`, `fakeAsync` para el debounce) verde: abrir el home pide solo `page=1&limit=12` (REQ-6.1); el botón aparece si `totalPages > page` y desaparece en la última (REQ-6.2, 6.4); `loadMore` pide la página siguiente, agrega sin repetir `id` y deshabilita el botón mientras tanto (REQ-6.3); escribir pide la página 1 con `search` solo tras 300 ms sin pulsar (REQ-6.5); elegir y quitar categoría pide la página 1 con y sin `categoryId` y reemplaza (REQ-6.6); una respuesta tardía de una búsqueda anterior se descarta (REQ-6.7); `items: []` muestra el estado vacío (REQ-6.8); error en la carga muestra el bloque de error con "Reintentar" y error en `loadMore` conserva los productos y deja el botón en "Reintentar" (REQ-6.9). Manual en el navegador: con el backend local y más de 12 productos publicados, comprobar "Cargar más", buscar con una palabra y combinarla con una categoría.
  - _Requisitos: REQ-6.1 a 6.9_

- [x] 18. Estados de producto coherentes
  - Detalle: reemplazar `'PUBLIC'` por `'PUBLISHED'` en `prd-res.model.ts`, `product.model.ts`, `product-form-dialog.component.ts` y `product-list.component.ts`; corregir la comparación en `product-list.html` (línea ~134) y `product-mobile-card.component.html` (línea ~18).
  - Depende de: —
  - Verificación: `ng build` sin errores de tipos; `product-mobile-card.component.spec.ts` y una prueba del `product-list` (TestBed) verdes: un producto `PUBLISHED` muestra la clase `badge-success` en ambos, y `DRAFT`/`ARCHIVED` mantienen las suyas (REQ-7.2); una prueba del formulario confirma que el valor enviado al editar/crear es uno de `DRAFT | PUBLISHED | ARCHIVED` (REQ-7.3); `grep -r "'PUBLIC'" frontend/src` no devuelve nada (REQ-7.1).
  - _Requisitos: REQ-7.1, REQ-7.2, REQ-7.3_

## Cierre

- [ ] 19. Chequeo previo al despliegue (manual)
  - Detalle: contra la base de producción (solo lectura), ejecutar `SELECT status, count(*) FROM products GROUP BY status;` y anotar los resultados en esta spec. Publicar a mano (`status = 'PUBLISHED'`) los `DRAFT`/`ARCHIVED` que deban seguir visibles: **tras el despliegue el catálogo público solo muestra `PUBLISHED`**. Si el despliegue define `AI_RATE_LIMIT`/`AI_RATE_TTL_SECONDS`, anotar los valores. Recordar que el compose de producción vive en el repo `web-stack`: las variables son opcionales y usan 20/3600 por defecto. Avisar que el contrato de `GET /products` cambia: cualquier cliente que no sea el frontend de este repo debe adaptarse.
  - Depende de: 6
  - Verificación: el conteo por estado está anotado y el usuario confirmó qué productos publicar antes de desplegar.
  - _Requisitos: REQ-1.8_

- [x] 20. Verificación final de la spec
  - Detalle: correr `npm run build`, `npx eslint` sobre los archivos tocados, `npx jest` (unitarios) y las suites de integración completas (`orders-*` y `catalog-*`) en el backend; `npx ng test --watch=false` y `npx ng build` en el frontend; recorrer los 7 REQ criterio por criterio y llenar la tabla "Verificación final" de `requirements.md` con sí/no y evidencia.
  - Depende de: 1 a 19
  - Verificación: la tabla de `requirements.md` está completa; ningún criterio queda sin evidencia; las suites nuevas pasan, las de `orders-integrity` siguen verdes y las suites de scaffold viejas siguen fallando exactamente igual que antes (no se rompió nada más; comprobado contra la base original con `git stash`).
  - Nota: el recorrido de criterios y la tabla de `requirements.md` están hechos. El **cierre definitivo** queda condicionado a la tarea 19 (manual) y a la verificación manual de la UI de la tarea 17.
  - _Requisitos: todos_

---
**Estado:** tareas 1 a 18 y 20 completas. Pendiente: tarea 19 (manual, del usuario) y verificación manual de la UI del home (tarea 17).
