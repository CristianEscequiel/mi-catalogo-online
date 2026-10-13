# Requisitos: catalog-access

## Contexto y decisiones

**Origen del pedido.** Segunda de las tres specs de la Fase 2 de la auditoría de `mi-catalogo-online` (la primera, `orders-integrity`, ya está implementada en la rama `fix/orders-integrity`):

| Spec | Cubre |
|---|---|
| `orders-integrity` | Stock atómico, dinero exacto, estados de orden, devolución de stock, vencimiento (hecha) |
| `catalog-access` (esta) | Catálogo público solo `PUBLISHED` y paginado, propiedad de productos/categorías para GUEST, tope de uso de la IA |
| `infra-hardening` (pendiente) | Puertos, `USER node`, Swagger, `CORS_ORIGIN`, `uploads/` fuera de git, dependencia `aide`, validación de config |

**Hechos verificados en el código (base de esta spec):**

- `GET /products` (`product.controller.ts:37-42`, `product.service.ts:45-50`) devuelve **todos** los productos con `user.profile` y `categories`, sin filtro de `status`, sin paginar y sin orden definido. El home (`home-page.ts:200-222`) lo trae todo y filtra por texto y categoría **en el navegador**.
- `GET /products/:id`, `GET /products/slug/:slug`, `GET /products/user/:id` y `GET /categories/:id/posts` son públicos y devuelven productos `DRAFT` y `ARCHIVED`.
- `PUT /products/:id`, `DELETE /products/:id`, `POST|DELETE /products/:id/image` aceptan a cualquier `ADMIN` o `GUEST` **sobre cualquier producto**: no se comprueba al dueño. Lo mismo en `PUT|DELETE /categories/:id` y `POST|DELETE /categories/:id/image` (la categoría tiene dueño: `create` guarda `user`). Un GUEST de la demo puede editar o borrar el catálogo del administrador.
- `PUT /products/:id/publish` ya comprueba al dueño (`product.service.ts:172-183`) pero **no cambia el estado**: devuelve el producto tal cual. El estado se fija solo con `status` en el DTO de crear/editar.
- `CartService.upsertItem` (`cart.service.ts:40-66`), `FavoritesService.add` (`favorites.service.ts:26-50`) y el checkout (`OrdersService.createOrder`) cargan el producto **sin mirar su estado**: un producto `ARCHIVED` se puede seguir agregando al carrito y comprando.
- `GET /products/generate-ai/:name` y `POST /products/generate-from-image` llaman a OpenAI (cuestan dinero) para cualquier `ADMIN` o `GUEST` sin ningún tope. La cuenta de demo es compartida.
- Ya existe `@nestjs/throttler` (en `contact` y `auth`), con tope por IP y configurable por variables de entorno (`CONTACT_RATE_LIMIT`, `CONTACT_RATE_TTL_SECONDS`).
- El panel de administración **no** usa `GET /products`: carga los productos propios con `GET /users/:id/products` (protegido por `SelfOrAdminGuard`). Ese endpoint no cambia.
- Deriva de tipos en el frontend: `prd-res.model.ts`, `product.model.ts` y los formularios declaran el estado como `'DRAFT' | 'PUBLIC' | 'ARCHIVED'`, pero el backend y `product-form.component.ts` usan `PUBLISHED`. Las insignias que comparan con `'PUBLIC'` (`product-list.html:134`, `product-mobile-card.component.html:18`) nunca se activan.

**Decisiones tomadas con el usuario:**

1. **Paginación:** del lado del servidor. `GET /products?page&limit&search&categoryId` devuelve `{ items, total, page, limit, totalPages }`; el home pasa a "Cargar más" con búsqueda y categoría resueltas en el servidor. Cambia el contrato de ese endpoint.
2. **Datos existentes:** no se tocan. La migración no cambia ningún `status`; antes de desplegar el usuario revisa cuántos productos hay por estado y publica a mano los que correspondan.
3. **Tope de IA:** 20 llamadas por hora por usuario autenticado, configurable con `AI_RATE_LIMIT` y `AI_RATE_TTL_SECONDS`.
4. **Carrito y checkout:** se bloquean los productos no publicados (toca código de la spec anterior).
5. **Visibilidad:** "no publicado = no existe para el público". Lo que no es `PUBLISHED` responde 404 en los endpoints públicos; el dueño y el ADMIN ven sus productos no publicados solo por `GET /users/:id/products`.
6. **Propiedad:** un `ADMIN` puede modificar cualquier producto o categoría; un `GUEST` solo los suyos.

## Fuera de alcance

- Hacer que `PUT /products/:id/publish` cambie el estado, o permitir que un ADMIN publique productos ajenos (hoy solo el dueño pasa su comprobación).
- El límite de demo "GUEST no puede tener más de 5 productos/categorías" (hoy cuenta toda la tabla, no solo lo del GUEST).
- Paginar las categorías, `GET /users/:id/products`, favoritos u órdenes.
- Relevancia o ranking de la búsqueda, búsqueda por SKU o por nombre de categoría.
- Vista previa pública de un borrador para su dueño.
- Cambiar roles, JWT o el alta de usuarios (hechos en la Fase 1).
- Backoff, contadores persistentes o compartidos entre instancias para el tope de IA: el contador vive en memoria del proceso y se reinicia con él.
- Infraestructura (spec `infra-hardening`) y arreglar los tests de scaffold viejos.

## REQ-1: El catálogo público solo muestra productos publicados

**Historia de usuario:** Como visitante, quiero ver solo productos publicados, para no encontrar borradores ni productos retirados.

### Criterios de aceptación
1. CUANDO se consulta `GET /products` EL SISTEMA DEBERÁ incluir únicamente productos con estado `PUBLISHED`.
2. CUANDO se consulta `GET /products/slug/:slug` o `GET /products/:id` de un producto `DRAFT` o `ARCHIVED` EL SISTEMA DEBERÁ responder HTTP 404, igual que para un producto inexistente.
3. CUANDO se consulta `GET /products/user/:id` EL SISTEMA DEBERÁ incluir únicamente productos `PUBLISHED` de ese usuario, y devolver una lista vacía (HTTP 200) si no tiene ninguno.
4. CUANDO se consulta `GET /categories/:id/posts` EL SISTEMA DEBERÁ incluir únicamente productos `PUBLISHED` de esa categoría.
5. CUANDO un usuario agrega a favoritos un producto que no está `PUBLISHED` EL SISTEMA DEBERÁ responder HTTP 404 y no crear el favorito.
6. CUANDO un usuario consulta sus favoritos EL SISTEMA DEBERÁ incluir únicamente productos `PUBLISHED`.
7. CUANDO el dueño o un ADMIN consulta `GET /users/:id/products` EL SISTEMA DEBERÁ seguir devolviendo todos los productos, sin importar su estado.
8. CUANDO se despliega esta spec EL SISTEMA DEBERÁ conservar el `status` de todos los productos existentes sin modificarlo. _(Enmienda en fase de diseño: decía "cuando se aplica la migración"; el diseño no necesita ninguna migración, así que el criterio pasa a ser que ningún código de la spec escribe `status`.)_

## REQ-2: Listado público paginado y filtrado en el servidor

**Historia de usuario:** Como visitante, quiero que el catálogo cargue por tandas, para que el home siga siendo rápido cuando haya muchos productos.

### Criterios de aceptación
1. CUANDO se consulta `GET /products` EL SISTEMA DEBERÁ responder `{ items, total, page, limit, totalPages }`, con `total` igual a la cantidad de productos `PUBLISHED` que cumplen los filtros y `totalPages = ceil(total / limit)`.
2. CUANDO no se envían `page` ni `limit` EL SISTEMA DEBERÁ usar `page = 1` y `limit = 12`.
3. CUANDO se envía `limit` mayor que 50, menor que 1 o no entero, o `page` menor que 1 o no entero EL SISTEMA DEBERÁ responder HTTP 400.
4. CUANDO se envía `search` EL SISTEMA DEBERÁ devolver los productos cuyo nombre o descripción contiene el texto, sin distinguir mayúsculas, tratando `%` y `_` como caracteres literales.
5. CUANDO `search` tiene más de 100 caracteres EL SISTEMA DEBERÁ responder HTTP 400.
6. CUANDO se envía `categoryId` EL SISTEMA DEBERÁ devolver solo los productos de esa categoría, y cada producto devuelto deberá conservar **todas** sus categorías, no solo la filtrada.
7. CUANDO `categoryId` no es un entero positivo EL SISTEMA DEBERÁ responder HTTP 400.
8. CUANDO se combinan `search` y `categoryId` EL SISTEMA DEBERÁ aplicar ambos filtros a la vez.
9. EL SISTEMA DEBERÁ ordenar el listado del más nuevo al más antiguo (`createdAt` descendente, desempate por `id` descendente), de modo que dos páginas consecutivas no repitan ni omitan productos.
10. CUANDO `page` supera `totalPages` EL SISTEMA DEBERÁ responder HTTP 200 con `items` vacío y el `total` real.
11. CUANDO no hay productos que cumplan los filtros EL SISTEMA DEBERÁ responder HTTP 200 con `items` vacío, `total = 0` y `totalPages = 0`.
12. CUANDO se devuelve un producto en `items` EL SISTEMA DEBERÁ mantener la misma forma que hoy, incluida la reducción del dueño a `id` y nombre/apellido/avatar del perfil.

## REQ-3: Cada usuario modifica solo lo suyo (GUEST)

**Historia de usuario:** Como administrador, quiero que un usuario de demo solo pueda tocar lo que creó, para que no pueda editar ni borrar mi catálogo.

### Criterios de aceptación
1. CUANDO un GUEST edita (`PUT /products/:id`), borra (`DELETE /products/:id`) o sube o borra la imagen (`POST|DELETE /products/:id/image`) de un producto que no creó EL SISTEMA DEBERÁ responder HTTP 403 sin modificar nada.
2. CUANDO un GUEST edita, borra o sube o borra la imagen (`PUT|DELETE /categories/:id`, `POST|DELETE /categories/:id/image`) de una categoría que no creó EL SISTEMA DEBERÁ responder HTTP 403 sin modificar nada.
3. CUANDO un GUEST hace una de esas operaciones sobre un producto o categoría que creó EL SISTEMA DEBERÁ ejecutarla igual que hoy.
4. CUANDO un ADMIN hace cualquiera de esas operaciones sobre un producto o categoría de cualquier dueño EL SISTEMA DEBERÁ ejecutarla igual que hoy.
5. CUANDO el producto o la categoría no existe EL SISTEMA DEBERÁ responder HTTP 404, para ADMIN y para GUEST.
6. CUANDO un usuario con rol `CLIENT` o sin sesión intenta alguna de esas operaciones EL SISTEMA DEBERÁ responder HTTP 403 o 401 respectivamente, igual que hoy.
7. CUANDO se rechaza una operación por no ser el dueño EL SISTEMA DEBERÁ no borrar ni reemplazar ningún archivo de `uploads/`.

## REQ-4: Carrito y checkout rechazan productos no publicados

**Historia de usuario:** Como dueño de la tienda, quiero que un producto retirado del catálogo no se pueda comprar, para no vender lo que ya no ofrezco.

### Criterios de aceptación
1. CUANDO un usuario agrega o actualiza en el carrito un producto que no está `PUBLISHED` EL SISTEMA DEBERÁ responder HTTP 404 y no modificar el carrito.
2. CUANDO el carrito contiene un producto que dejó de estar `PUBLISHED` EL SISTEMA DEBERÁ seguir listándolo en `GET /cart` y permitir quitarlo con `DELETE /cart/:productId`.
3. SI al confirmar la orden algún producto del carrito no está `PUBLISHED` ENTONCES EL SISTEMA DEBERÁ rechazar la orden con HTTP 400 nombrando el producto, sin descontar stock de ningún producto, sin crear orden ni ítems y conservando el carrito.
4. CUANDO se confirma una orden con todos los productos `PUBLISHED` EL SISTEMA DEBERÁ comportarse igual que hoy (stock, totales y vaciado del carrito).
5. CUANDO un producto pasa a no publicado después de haber sido comprado EL SISTEMA DEBERÁ conservar sin cambios las órdenes ya creadas que lo incluyen.

## REQ-5: Tope de uso de la IA

**Historia de usuario:** Como dueño de la cuenta de OpenAI, quiero limitar cuántas veces puede usar la IA cada usuario, para que la demo compartida no genere un gasto descontrolado.

### Criterios de aceptación
1. CUANDO un usuario autenticado hace una llamada a `GET /products/generate-ai/:name` o `POST /products/generate-from-image` y todavía no superó el tope EL SISTEMA DEBERÁ ejecutarla igual que hoy.
2. CUANDO un usuario supera el tope EL SISTEMA DEBERÁ responder HTTP 429 con un mensaje en español y no llamar a OpenAI.
3. EL SISTEMA DEBERÁ contar las llamadas por usuario autenticado (id del token), con un único contador compartido por los dos endpoints, y no por dirección IP.
4. CUANDO un usuario agotó su tope EL SISTEMA DEBERÁ seguir atendiendo con normalidad a los demás usuarios.
5. EL SISTEMA DEBERÁ usar 20 llamadas por 3600 segundos por defecto, tomando los valores de `AI_RATE_LIMIT` y `AI_RATE_TTL_SECONDS` cuando estén definidos y sean enteros positivos.
6. SI `AI_RATE_LIMIT` o `AI_RATE_TTL_SECONDS` están definidos pero no son enteros positivos ENTONCES EL SISTEMA DEBERÁ usar el valor por defecto y registrar una advertencia en el log.
7. CUANDO una llamada a OpenAI falla EL SISTEMA DEBERÁ contarla igual contra el tope.
8. CUANDO un usuario sin sesión o sin rol permitido llama a esos endpoints EL SISTEMA DEBERÁ responder 401 o 403 como hoy, sin consumir tope de nadie.

## REQ-6: El home usa el listado paginado

**Historia de usuario:** Como visitante, quiero buscar, filtrar por categoría y cargar más productos desde el home, para encontrar lo que busco sin esperar a que cargue todo.

### Criterios de aceptación
1. CUANDO se abre el home EL SISTEMA DEBERÁ pedir solo la primera página del catálogo y mostrar esos productos.
2. CUANDO `totalPages` es mayor que la página cargada EL SISTEMA DEBERÁ mostrar el botón "Cargar más".
3. CUANDO se pulsa "Cargar más" EL SISTEMA DEBERÁ pedir la página siguiente, agregar sus productos a los ya mostrados y deshabilitar el botón mientras la petición está en curso.
4. CUANDO se cargó la última página EL SISTEMA DEBERÁ ocultar el botón "Cargar más".
5. CUANDO se escribe en la búsqueda EL SISTEMA DEBERÁ esperar 300 ms desde la última pulsación, pedir la página 1 con `search` y reemplazar los productos mostrados.
6. CUANDO se elige o se quita una categoría EL SISTEMA DEBERÁ pedir la página 1 con o sin `categoryId` y reemplazar los productos mostrados.
7. CUANDO una respuesta tardía corresponde a una búsqueda o categoría que ya no es la actual EL SISTEMA DEBERÁ descartarla sin mostrarla.
8. CUANDO no hay resultados EL SISTEMA DEBERÁ mostrar el estado vacío existente.
9. CUANDO la petición falla EL SISTEMA DEBERÁ mostrar el mensaje de error existente con la opción de reintentar, conservando los productos ya cargados si falla "Cargar más".

## REQ-7: Estados de producto coherentes en el frontend

**Historia de usuario:** Como administrador, quiero que las insignias de estado reflejen el estado real del producto, para saber qué está publicado.

### Criterios de aceptación
1. EL SISTEMA DEBERÁ declarar los estados de producto del frontend como `'DRAFT' | 'PUBLISHED' | 'ARCHIVED'`, iguales a los del backend.
2. CUANDO un producto está `PUBLISHED` EL SISTEMA DEBERÁ mostrar la insignia de publicado en la tabla del panel y en la tarjeta móvil.
3. CUANDO se crea o edita un producto desde el panel EL SISTEMA DEBERÁ enviar uno de los tres estados válidos del backend.

---

## Autorrevisión (antes de pedir aprobación)

- **¿Algún requisito mezcla dos comportamientos?** Se separaron en REQ propios la visibilidad (REQ-1), la paginación (REQ-2), la propiedad (REQ-3), el carrito (REQ-4), la IA (REQ-5), el home (REQ-6) y la deriva de tipos (REQ-7). Dentro de REQ-3 el criterio 1 junta editar, borrar y imagen de producto porque comparten la misma regla (dueño o ADMIN) y el mismo resultado (403); se verifican por separado en las tareas.
- **¿Algún criterio con palabras no verificables?** Se fijaron los números concretos (12 por defecto, máximo 50, 100 caracteres, 300 ms, 20 por 3600 s) y el código HTTP de cada rechazo.
- **¿Falta un camino no feliz?** Cubierto: entradas inválidas (REQ-2.3, 2.5, 2.7), vacío (REQ-2.11), página fuera de rango (REQ-2.10), falla de OpenAI (REQ-5.7), falla de red en el home (REQ-6.9), respuestas desordenadas (REQ-6.7), permisos (REQ-3.5, 3.6, 5.8) y concurrencia de búsquedas (REQ-6.7).
- **Riesgo conocido:** el contrato de `GET /products` cambia de arreglo a objeto. Los únicos consumidores en el repo son el home y `ProductService.getAllProducts` (el panel ya no lo usa). Se cambian juntos en esta spec; cualquier cliente externo del endpoint dejaría de funcionar.

## Verificación final

Recorrido hecho al cerrar las tareas 1 a 18 (2026-10-12). Evidencia: Postgres real en contenedor efímero, suites de integración corridas en serie (`--runInBand`): `catalog-*` 79 pruebas y `orders-*` 42, todas verdes. Unitarios del backend: 210 pasan. Frontend (Karma): 33 pasan. Los únicos fallos son las suites de scaffold viejas, que fallan igual sin estos cambios (comprobado contra la base original con `git stash`): 6 suites unitarias y `test/app.e2e-spec.ts` en el backend; `App` x2, `AuthFacade`, `LoginForm` y `Profile` en el frontend.

Las pruebas con nombre de archivo sin carpeta están en `backend/test/`. Los pendientes manuales (UI del home y chequeo previo al despliegue) figuran al final.

| Criterio | Cumplido | Evidencia |
|---|---|---|
| REQ-1.1 | sí | `catalog-visibility`: "GET /products devuelve solo los publicados" |
| REQ-1.2 | sí | `catalog-visibility`: 404 de `/products/:id` y `/slug/:slug` para DRAFT y ARCHIVED, igual que un id inexistente; el publicado responde 200 |
| REQ-1.3 | sí | `catalog-visibility`: `/products/user/:id` solo publicados y `[]` con 200 si no tiene |
| REQ-1.4 | sí | `catalog-visibility`: `/categories/:id/posts` solo publicados |
| REQ-1.5 | sí | `catalog-cart`: agregar favorito DRAFT/ARCHIVED → 404 y 0 filas; `favorites.service.spec.ts` |
| REQ-1.6 | sí | `catalog-cart`: el listado omite el producto archivado después de ser favorito |
| REQ-1.7 | sí | `catalog-visibility`: `/users/:id/products` devuelve los tres estados al dueño y a un ADMIN |
| REQ-1.8 | sí | No hay migración nueva (`git status` sin archivos en `migrations/`) y ningún código escribe `status`; `catalog-visibility`: recorrer los endpoints públicos deja los estados idénticos |
| REQ-2.1 | sí | `catalog-visibility`: `total 30`, `totalPages 3`; `product.service.spec.ts`; humo sobre base vacía |
| REQ-2.2 | sí | `catalog-visibility` (defaults `page 1`, `limit 12`) y `list-products-query.dto.spec.ts` |
| REQ-2.3 | sí | `catalog-visibility`: `limit` 51/0/1.5/abc y `page` 0/-1 → 400; `limit 50` → 200; `list-products-query.dto.spec.ts` |
| REQ-2.4 | sí | `catalog-visibility`: búsqueda sin distinguir mayúsculas en nombre y descripción; `%` y `_` literales; `escape-like.spec.ts` |
| REQ-2.5 | sí | `catalog-visibility`: `search` de 101 caracteres → 400 y de 100 → 200 |
| REQ-2.6 | sí | `catalog-visibility`: con `categoryId` cada producto conserva todas sus categorías; un producto con dos categorías no se duplica ni altera el conteo |
| REQ-2.7 | sí | `catalog-visibility`: `categoryId` 0 y `abc` → 400 |
| REQ-2.8 | sí | `catalog-visibility`: `search` + `categoryId` combinados |
| REQ-2.9 | sí | `catalog-visibility`: 3 páginas de 30 productos, 30 distintos y en orden del más nuevo al más antiguo |
| REQ-2.10 | sí | `catalog-visibility`: `page=99` → 200, `items: []`, `total 5` |
| REQ-2.11 | sí | `catalog-visibility`: sin coincidencias → `total 0`, `totalPages 0`; base vacía en el humo |
| REQ-2.12 | sí | `catalog-visibility`: el dueño llega solo con `id` y `profile` (`name`, `lastName`, `avatar`), sin email, rol, contraseña ni token; la app de prueba registra `ClassSerializerInterceptor` como `main.ts` |
| REQ-3.1 | sí | `catalog-ownership` `/products`: GUEST ajeno recibe 403 en `PUT`, `DELETE`, `POST` y `DELETE` de imagen, y el recurso queda intacto; `product.service.spec.ts` |
| REQ-3.2 | sí | `catalog-ownership` `/categories`: las mismas cuatro operaciones; `category.service.spec.ts` |
| REQ-3.3 | sí | `catalog-ownership`: el GUEST dueño edita, sube, borra la imagen y elimina lo suyo |
| REQ-3.4 | sí | `catalog-ownership`: el ADMIN hace las cuatro operaciones sobre lo de otro, y modifica una categoría sin dueño |
| REQ-3.5 | sí | `catalog-ownership`: id inexistente → 404 para ADMIN y GUEST en las cuatro operaciones, de productos y categorías |
| REQ-3.6 | sí, con una salvedad | `CLIENT` recibe 403 en las cuatro operaciones y nada cambia (verificado). Sin sesión: el arnés reemplaza `AuthGuard('jwt')` (como en `orders-integrity`), así que la prueba verifica el rechazo (403 del arnés) pero no el 401 real; ese guard no se modificó en esta spec |
| REQ-3.7 | sí | `catalog-ownership`: tras un rechazo la carpeta de subidas contiene solo el archivo original (no se borra ni reemplaza) y no queda el archivo recién subido; la subida a un id inexistente tampoco deja huérfanos |
| REQ-4.1 | sí | `catalog-cart`: agregar al carrito un DRAFT/ARCHIVED → 404 y 0 filas; `cart.service.spec.ts` |
| REQ-4.2 | sí | `catalog-cart`: un producto archivado después de estar en el carrito sigue en `GET /cart` y se quita con `DELETE` |
| REQ-4.3 | sí | `catalog-cart`: checkout con un producto DRAFT/ARCHIVED → 400 que nombra el producto, stock de ambos intacto, 0 órdenes y 0 ítems, carrito conservado (2 filas). Comprobado con mutación: sin el chequeo, 2 pruebas fallan |
| REQ-4.4 | sí | `catalog-cart`: orden con todo publicado → 201, total 8.3, stock descontado, carrito vacío; las 4 suites de `orders-*` siguen verdes |
| REQ-4.5 | sí | `catalog-cart`: la orden ya creada se lee igual (total, ítems, nombre y precio) después de archivar el producto |
| REQ-5.1 | sí | `catalog-ai`: 3 llamadas dentro del tope (límite 3) se atienden, mezclando ambos endpoints |
| REQ-5.2 | sí | `catalog-ai`: la 4.ª → 429 con el mensaje en español y OpenAI recibió solo 3 llamadas |
| REQ-5.3 | sí | `catalog-ai`: un único contador entre `generate-ai` y `generate-from-image`; `ai-throttler.guard.spec.ts` (tracker `user:<id>`, clave compartida; la prueba falla si se quita el `generateKey`) |
| REQ-5.4 | sí | `catalog-ai` y `ai-throttler.guard.spec.ts`: otro usuario sigue recibiendo 200 |
| REQ-5.5 | sí | `catalog-ai`: con `AI_RATE_LIMIT=abc` el tope efectivo es 20; con `3` es 3; `ai-rate-limit.config.spec.ts`. El default de 3600 s se verifica en la configuración del módulo (`product.module.ts`), sin prueba de expiración |
| REQ-5.6 | sí | `catalog-ai`: `Logger.warn` recibe un mensaje con `AI_RATE_LIMIT`; `ai-rate-limit.config.spec.ts` (`0`, `-5`, `abc`, `2.5`, vacío) |
| REQ-5.7 | sí | `catalog-ai`: una llamada que falla en OpenAI (500) cuenta y la 4.ª recibe 429 |
| REQ-5.8 | sí, con la misma salvedad que REQ-3.6 | `catalog-ai`: 5 intentos con rol `CLIENT` (403) no consumen tope: el mismo usuario como GUEST conserva sus 3 llamadas; sin sesión se rechaza sin llamar a OpenAI (403 del arnés; el 401 real es del guard sin tocar) |
| REQ-6.1 | sí | `home-page.spec.ts`: al abrir pide solo `page 1`, `limit 12`, sin `search` ni `categoryId` |
| REQ-6.2 | sí | `home-page.spec.ts`: el botón aparece si `totalPages > page` y no aparece con una sola página |
| REQ-6.3 | sí | `home-page.spec.ts`: pide la página 2, agrega sin repetir `id`, se deshabilita en curso y un segundo clic no dispara otra petición |
| REQ-6.4 | sí | `home-page.spec.ts`: en la última página el botón desaparece |
| REQ-6.5 | sí | `home-page.spec.ts`: sin petición a los 299 ms y con `search` a los 300; seguir escribiendo reinicia la espera |
| REQ-6.6 | sí | `home-page.spec.ts`: elegir y quitar categoría pide la página 1 con y sin `categoryId` y reemplaza; repetir la misma no vuelve a pedir |
| REQ-6.7 | sí | `home-page.spec.ts`: una respuesta tardía y una "página 2" de un filtro anterior se descartan. Comprobado con mutación: sin el contador de peticiones, 2 pruebas fallan |
| REQ-6.8 | sí | `home-page.spec.ts`: `items: []` muestra el estado vacío existente y oculta el botón |
| REQ-6.9 | sí | `home-page.spec.ts`: error de carga → bloque de error con "Reintentar" que vuelve a pedir; error en "Cargar más" conserva los productos y deja el botón en "Reintentar" |
| REQ-7.1 | sí | `grep "'PUBLIC'" frontend/src` sin resultados; `ng build` compila con los tipos `'DRAFT' | 'PUBLISHED' | 'ARCHIVED'` |
| REQ-7.2 | sí | `product-mobile-card.component.spec.ts` y `product-list.component.spec.ts`: `PUBLISHED` muestra `badge-success` en la tarjeta móvil y en la tabla; `DRAFT` y `ARCHIVED` mantienen las suyas |
| REQ-7.3 | sí | `product-form.component.spec.ts`: las tres opciones del selector son valores válidos del backend y elegir `PUBLISHED` deja ese valor en el formulario; `product-list.component.spec.ts`: el estado inicial es `DRAFT` |

**Pendiente de verificación manual** (no cuenta como incumplido, pero la spec no se da por cerrada sin esto):
1. **UI del home en el navegador** (tarea 17): con el backend local y más de 12 productos publicados, comprobar "Cargar más", una búsqueda y su combinación con una categoría.
2. **Chequeo previo al despliegue** (tarea 19): contar productos por estado en producción y publicar a mano los que deban seguir visibles.

**Observaciones de la verificación:**
- El criterio REQ-1.8 se enmendó en la fase de diseño (ver su nota): no hay migración.
- Las suites de integración deben correrse en serie; en paralelo se pisan los datos y fallan (no es un defecto de esta spec: `orders-integrity` ya tenía la misma restricción).
- `eslint` sobre los archivos tocados solo marca `'_imageUrl'` y `'_thumbnailUrl'` sin usar en `category.service.ts` y `product.service.ts`, que ya estaban antes de esta spec.
