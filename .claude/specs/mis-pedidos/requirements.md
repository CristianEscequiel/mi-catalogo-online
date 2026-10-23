# Requisitos: mis-pedidos

## Contexto y decisiones
- **Origen:** Fase 4 del plan de la auditoría («Mis pedidos» del cliente, `GET /orders/me` y su página), listada como imprescindible en `.claude/specs/pendientes.md`. Hoy el cliente solo ve su pedido en la pantalla de éxito del checkout (`/checkout/success/:orderId`); si sale de ahí no tiene cómo volver a verlo ni a pagar.
- **Ya existe** `GET /orders/:id`: devuelve la orden al dueño (o a un ADMIN) y responde 404 si es ajena. Esta spec lo reutiliza para el detalle y no lo modifica. Lo que falta es el listado propio.
- **Decisiones del usuario (2026-10-23):**
  - Alcance: lista **y** detalle.
  - Paginación por servidor, mismo formato que `GET /products` (`{items,total,page,limit,totalPages}`) y «Cargar más» en el frontend.
  - Entrada desde el menú de usuario del header, junto a «Perfil».
  - El detalle de un pedido `PENDING_PAYMENT` muestra los datos de transferencia y el botón de WhatsApp que hoy solo ve la pantalla de éxito del checkout.
- **Sin migración:** `orders` ya tiene el índice `IDX_orders_user` sobre `user_id`.
- **Rol:** el listado propio es para cualquier usuario autenticado (`CLIENT`, `ADMIN`, `GUEST`); un ADMIN que lo pide ve solo sus pedidos, no los de todos (para eso sigue `GET /orders`).
- **Formatos:** fechas y montos siguen lo que ya usa el panel de órdenes y la pantalla de éxito: fecha con `date:'short'` y montos como `$ ` + `number:'1.0-0'`.
- **Sesión vencida:** el interceptor del frontend (`auth-interceptor.ts`) no trata el 401; en estas páginas un 401 cae en el mismo mensaje de error que cualquier otra falla. Mejorar eso no es parte de esta spec.

## Fuera de alcance
- Cancelación del pedido por el cliente, pasarela de pago, emails transaccionales y seguimiento de envío (otros ítems de la Fase 4).
- Filtros o búsqueda dentro de Mis pedidos.
- Cambiar `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` o el panel de administración de órdenes.
- Enlace a Mis pedidos desde la pantalla de éxito del checkout.
- Volver a comprar un pedido.
- Redirigir al login cuando el token vence a mitad de la navegación.

## REQ-1: Listado propio de pedidos (backend)

**Historia de usuario:** Como cliente autenticado, quiero pedir la lista de mis pedidos, para ver todo lo que compré.

### Criterios de aceptación
1. CUANDO un usuario autenticado pide `GET /orders/me` EL SISTEMA DEBERÁ responder 200 con un objeto `{ items, total, page, limit, totalPages }`.
2. CUANDO un usuario autenticado pide `GET /orders/me` EL SISTEMA DEBERÁ incluir en `items` solo las órdenes cuyo `userId` es el del token.
3. CUANDO un usuario autenticado pide `GET /orders/me` EL SISTEMA DEBERÁ ordenar `items` por `createdAt` descendente y, a igual fecha, por `id` descendente.
4. CUANDO un usuario autenticado pide `GET /orders/me` EL SISTEMA DEBERÁ devolver en cada elemento de `items` exactamente: `id`, `status`, `total`, `createdAt` e `itemCount` (cantidad de líneas del pedido).
5. CUANDO la petición no trae `page` ni `limit` EL SISTEMA DEBERÁ usar `page = 1` y `limit = 10`.
6. CUANDO `page` o `limit` no es un entero mayor o igual a 1, o `limit` es mayor que 50, EL SISTEMA DEBERÁ responder 400.
7. SI el usuario no tiene pedidos ENTONCES EL SISTEMA DEBERÁ responder 200 con `items = []`, `total = 0` y `totalPages = 0`.
8. CUANDO `page` supera `totalPages` EL SISTEMA DEBERÁ responder 200 con `items = []` y el `total` real.
9. CUANDO la petición no trae token válido EL SISTEMA DEBERÁ responder 401.
10. CUANDO un ADMIN pide `GET /orders/me` EL SISTEMA DEBERÁ devolver solo las órdenes de ese ADMIN.
11. CUANDO un usuario autenticado pide `GET /orders/me` EL SISTEMA DEBERÁ resolverlo como el listado propio y responder 200 (no como `GET /orders/:id`).
12. CUANDO se genera el Swagger EL SISTEMA DEBERÁ incluir `GET /orders/me` con sus parámetros `page` y `limit` y no alterar la documentación de los endpoints de órdenes existentes.

## REQ-2: El detalle de un pedido sigue siendo solo del dueño

**Historia de usuario:** Como cliente, quiero que nadie más pueda ver el detalle de mis pedidos, para proteger mis datos.

### Criterios de aceptación
1. CUANDO un usuario no ADMIN pide `GET /orders/:id` de una orden de otro usuario EL SISTEMA DEBERÁ responder 404.
2. CUANDO el dueño pide `GET /orders/:id` EL SISTEMA DEBERÁ devolver la orden con sus líneas, sin cambios respecto de hoy.

## REQ-3: Página «Mis pedidos» (frontend)

**Historia de usuario:** Como cliente, quiero una página con mis pedidos, para seguir su estado.

### Criterios de aceptación
1. CUANDO un usuario sin sesión entra a `/orders` EL SISTEMA DEBERÁ aplicar el mismo `authGuard` que el resto de las rutas protegidas.
2. MIENTRAS carga la primera página EL SISTEMA DEBERÁ mostrar un indicador de carga.
3. CUANDO llegan los pedidos EL SISTEMA DEBERÁ mostrar, por cada uno, el número, la fecha, la etiqueta del estado, el total y la cantidad de productos.
4. CUANDO llegan los pedidos EL SISTEMA DEBERÁ enlazar cada uno a `/orders/:id`.
5. CUANDO se muestra el estado de un pedido EL SISTEMA DEBERÁ usar una etiqueta de texto (`PENDING_PAYMENT` «Esperando transferencia», `PAID` «Pagado», `CANCELLED` «Cancelado», `DELIVERED` «Entregado»), de modo que el estado no dependa solo del color.
6. SI el usuario no tiene pedidos ENTONCES EL SISTEMA DEBERÁ mostrar el mensaje «Todavía no hiciste pedidos».
7. SI el usuario no tiene pedidos ENTONCES EL SISTEMA DEBERÁ mostrar un enlace al catálogo.
8. SI falla la carga de la primera página ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje de error.
9. CUANDO el usuario pulsa «Reintentar» tras un error de la primera página EL SISTEMA DEBERÁ repetir la petición.
10. SI `page < totalPages` ENTONCES EL SISTEMA DEBERÁ mostrar el botón «Cargar más»; en la última página no debe mostrarse.
11. CUANDO el usuario pulsa «Cargar más» EL SISTEMA DEBERÁ pedir la página siguiente.
12. CUANDO llega la página siguiente EL SISTEMA DEBERÁ agregar sus pedidos a continuación de los ya mostrados.
13. MIENTRAS la página siguiente está en curso EL SISTEMA DEBERÁ mantener deshabilitado el botón «Cargar más».
14. SI falla «Cargar más» ENTONCES EL SISTEMA DEBERÁ avisar del error y conservar los pedidos ya mostrados.

## REQ-4: Detalle de un pedido (frontend)

**Historia de usuario:** Como cliente, quiero ver el detalle de un pedido, para revisar qué compré y, si falta, cómo pagarlo.

### Criterios de aceptación
1. CUANDO el usuario sin sesión entra a `/orders/:id` EL SISTEMA DEBERÁ aplicar el `authGuard`.
2. MIENTRAS carga el pedido EL SISTEMA DEBERÁ mostrar un indicador de carga.
3. CUANDO llega el pedido EL SISTEMA DEBERÁ mostrar número, etiqueta del estado, fecha, nombre, email, dirección y total.
4. CUANDO llega el pedido EL SISTEMA DEBERÁ mostrar cada línea con producto, cantidad, precio unitario y subtotal.
5. SI el pedido está en `PENDING_PAYMENT` ENTONCES EL SISTEMA DEBERÁ mostrar los datos de transferencia (alias, CBU, titular, banco).
6. SI el pedido está en `PENDING_PAYMENT` ENTONCES EL SISTEMA DEBERÁ mostrar el botón que abre WhatsApp con el mensaje del pedido, igual que la pantalla de éxito del checkout.
7. SI el pedido no está en `PENDING_PAYMENT` ENTONCES EL SISTEMA NO DEBERÁ mostrar los datos de transferencia ni el botón de WhatsApp.
8. SI el backend responde error (401, 404, red u otro) ENTONCES EL SISTEMA DEBERÁ mostrar «No pudimos cargar este pedido».
9. SI falla la carga del pedido ENTONCES EL SISTEMA DEBERÁ mostrar un enlace a `/orders`.
10. SI el `:id` de la ruta no es un entero positivo ENTONCES EL SISTEMA DEBERÁ mostrar «No pudimos cargar este pedido» sin llamar al backend.
11. CUANDO se muestra el detalle de un pedido EL SISTEMA DEBERÁ ofrecer un enlace «Volver a mis pedidos» hacia `/orders`.

## REQ-5: Acceso desde el header

**Historia de usuario:** Como cliente, quiero llegar a Mis pedidos desde el menú, para no buscar la URL.

### Criterios de aceptación
1. CUANDO hay sesión iniciada EL SISTEMA DEBERÁ mostrar en el menú de usuario del header un ítem «Mis pedidos» con destino `/orders`, junto a «Mi perfil» (texto real del ítem actual; corregido el 2026-10-23, antes decía «Perfil»).
2. CUANDO no hay sesión EL SISTEMA NO DEBERÁ mostrar ese ítem.
3. CUANDO el usuario elige «Mis pedidos» EL SISTEMA DEBERÁ cerrar el menú y navegar a `/orders`.

## Requisitos no funcionales
- NFR-1: Sin migración ni cambios de esquema.
- NFR-2: Las páginas nuevas se cargan con `loadComponent`; el bundle inicial del frontend no supera 800 kB (hoy 764,54 kB).
- NFR-3: En las pantallas del cliente (éxito del checkout, Mis pedidos y detalle) los datos de transferencia, el mensaje de WhatsApp y las etiquetas de estado tienen una sola definición en el código, compartida por las tres (se comprueba con búsqueda de texto en `features/checkout`, `features/orders` y `shared`). *Enmienda 2026-10-23, tras la revisión del diseño:* el panel de administración (`order-admin.page`) queda explícitamente fuera y conserva su propia copia de las etiquetas.
- NFR-4: A 360 px de ancho ninguna de las dos páginas produce scroll horizontal (medido con `ego-verify-sdd`).
- NFR-5: Todos los componentes nuevos usan `OnPush` y el estado que se muestra va en signals; el lint del frontend sigue en 0 errores.
- NFR-6: Backend: lint en 0 y la suite unitaria completa en verde; Swagger solo agrega `GET /orders/me`.

## Preguntas abiertas
- Ninguna bloqueante.

## Verificación final
<!-- Completar al cerrar la spec, después de terminar tasks.md. -->
| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| REQ-1.1 | SÍ | `orders.service.spec.ts:54`, `orders.controller.spec.ts:77`; `orders.controller.ts:40-43` |
| REQ-1.2 | SÍ | `orders.service.spec.ts:71`; `orders.service.ts:112` (`where: { userId }`) |
| REQ-1.3 | SÍ | `orders.service.spec.ts:79`; `orders.service.ts:113` |
| REQ-1.4 | SÍ | `order.mapper.spec.ts:63`, `:69`; `orders.service.spec.ts:89`, `:98`, `:107` |
| REQ-1.5 | SÍ | `list-my-orders-query.dto.spec.ts:9`, `:15`; `orders.controller.spec.ts:87` |
| REQ-1.6 | SÍ | `list-my-orders-query.dto.spec.ts:30`; `orders.controller.spec.ts:96` |
| REQ-1.7 | SÍ | `orders.service.spec.ts:118` |
| REQ-1.8 | SÍ | `orders.service.spec.ts:127` |
| REQ-1.9 | SÍ | `orders.controller.spec.ts:103` (401) |
| REQ-1.10 | SÍ | `orders.service.spec.ts:135`; `orders.controller.spec.ts:110`; `me` sin `@Roles` |
| REQ-1.11 | SÍ | `orders.controller.spec.ts:119`; `@Get('me')` (línea 40) antes de `@Get(':id')` (línea 46) |
| REQ-1.12 | SÍ (evidencia estática) | Diff del controller solo agrega `@Get('me')` con sus decoradores; diff de Swagger antes/después registrado en T5; no se pudo repetir sin Postgres |
| REQ-2.1 | SÍ | `orders.service.spec.ts:146` (servicio real, 404); `orders.controller.spec.ts:130` |
| REQ-2.2 | SÍ | `orders.service.spec.ts:152`; `orders.controller.spec.ts:138` |
| REQ-3.1 | SÍ | `app.routes.spec.ts:57`; `app.routes.ts:71-73` |
| REQ-3.2 a 3.14 | SÍ | `my-orders-page.spec.ts:75` a `:207` (un test por criterio); REQ-3.11 también en `orders.service.spec.ts` (frontend) `:22`, `:34` |
| REQ-4.1 | SÍ | `app.routes.spec.ts:63`; `app.routes.ts:76-78` |
| REQ-4.2 a 4.11 | SÍ | `order-detail-page.spec.ts:68` a `:164`; REQ-4.5 y 4.6 también en `order-payment-info.spec.ts:33`, `:42` |
| REQ-5.1 | SÍ | `header.spec.ts:66`; `header.html:134-136` |
| REQ-5.2 | SÍ | `header.spec.ts:79` |
| REQ-5.3 | SÍ | `header.spec.ts:87`; `header.html:135` |
| NFR-1 | SÍ | Sin cambios en `backend/src/database` |
| NFR-2 | SÍ | Chunks perezosos de ambas páginas; bundle inicial 766,27 kB ≤ 800 |
| NFR-3 | SÍ | `order-status.spec.ts`, `order-whatsapp.spec.ts`; «Esperando transferencia» solo en `order-status.ts`, panel admin y specs |
| NFR-4 | NO VERIFICABLE | Falta T14 (`ego-verify-sdd` a 360 px sobre `/orders` y `/orders/:id`) |
| NFR-5 | SÍ | Lint frontend 0 (exige OnPush); estado en signals |
| NFR-6 | SÍ | Backend: lint 0, 46 suites y 456 tests en verde, build ok. Frontend: lint 0, 380 de 380, build ok |

---
**Estado:** Aprobado e implementado (T0 a T13 y T15 hechas; T14 y T17 pendientes)
