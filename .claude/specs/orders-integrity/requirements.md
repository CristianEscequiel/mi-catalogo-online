# Requisitos: orders-integrity

## Contexto y decisiones

**Origen del pedido.** Auditoría de seguridad y arquitectura de `mi-catalogo-online` (Fase 1 ya aplicada en `aef1d67`). La Fase 2 ("integridad del negocio") se parte en **tres specs independientes**; esta es la primera:

| Spec | Cubre |
|---|---|
| `orders-integrity` (esta) | Stock atómico en el checkout, dinero exacto, estados de orden, devolución de stock, vencimiento |
| `catalog-access` (pendiente) | Permisos de GUEST limitados a lo propio, catálogo público solo `PUBLISHED` y paginado |
| `infra-hardening` (pendiente) | Puertos 5433/3000, `USER node`, Swagger, `CORS_ORIGIN`, `uploads/` fuera de git, dependencia `aide`, validación de config |

**Hechos verificados en el código (base de esta spec):**

- `OrdersService.createOrder` (`backend/src/orders/orders.service.ts:16-96`) corre en una transacción, pero **lee el stock sin bloqueo** (`cartRepository.find` con `relations: ['product']`) y luego escribe `stock = leído - cantidad` con `productRepository.update`. Dos pedidos concurrentes leen el mismo valor y ambos pasan la verificación: **sobreventa** y stock negativo posible.
- `updateStatus` (`orders.service.ts:173-188`) acepta **cualquier** estado del enum sobre cualquier orden: se puede pasar de `DELIVERED` a `PENDING_PAYMENT`, o repetir `CANCELLED`.
- Cancelar **no devuelve el stock**. Una orden en `PENDING_PAYMENT` descuenta stock al crearse y nunca vence: quien no paga inmoviliza inventario indefinidamente.
- `price`, `total`, `unit_price` y `subtotal` son `float` (`product.entity.ts`, `order.entity.ts`, `order-item.entity.ts`). `CartService.findAllByUser` y `createOrder` suman con aritmética de punto flotante.
- Un producto sin precio (`price` nullable) se vende a `0` (`cartItem.product.price ?? 0`).
- `products.reserved_stock` existe pero ningún código lo usa.
- No hay `@nestjs/schedule` instalado: hoy no existe ninguna tarea programada.
- Los pagos son por **transferencia bancaria** (`frontend/src/app/core/config/bank-transfer.config.ts`) y el admin marca la orden como pagada a mano; por eso el plazo de pago se mide en horas, no en minutos.
- Los tests del backend: Jest ya resuelve `src/...` (Fase 1), pero las suites de scaffold viejas siguen fallando. Esta spec agrega tests propios; no arregla los viejos.

**Decisiones tomadas con el usuario:**

1. **Organización:** tres specs separadas, esta primero.
2. **Dinero:** `numeric(12,2)` en Postgres. La API sigue enviando números JSON con decimales; el contrato con el frontend no cambia.
3. **Vencimiento:** 48 horas por defecto, configurable con `ORDER_PAYMENT_TTL_HOURS`.
4. **Modelo de stock:** se mantiene el descuento **al crear la orden** (no al pagar); se devuelve al cancelar o vencer. No se usa `reserved_stock`.

## Fuera de alcance

- Pasarela de pago y confirmación automática de pagos.
- Cancelación de la orden por parte del cliente.
- Emails de orden creada, pagada o cancelada.
- Paginación del listado de órdenes del admin.
- Reembolsos: marcar `PAID → CANCELLED` solo corrige estado y stock; la devolución del dinero ocurre fuera del sistema.
- Uso o eliminación de la columna `reserved_stock`.
- Permisos de GUEST, visibilidad del catálogo e infraestructura (specs `catalog-access` e `infra-hardening`).
- Arreglar los tests de scaffold viejos o el lint existente.

## REQ-1: Descuento de stock atómico en el checkout

**Historia de usuario:** Como dueño de la tienda, quiero que nunca se venda más stock del que existe, para no aceptar pedidos que no puedo cumplir.

### Criterios de aceptación
1. CUANDO una orden se crea con stock suficiente EL SISTEMA DEBERÁ descontar de cada producto exactamente la cantidad pedida.
2. CUANDO dos o más órdenes concurrentes piden en total más unidades de un producto que su stock EL SISTEMA DEBERÁ confirmar solo las que entran en el stock y rechazar las demás con HTTP 400.
3. SI el stock de cualquier producto del carrito es insuficiente al confirmar ENTONCES EL SISTEMA DEBERÁ abortar la orden completa sin descontar stock de ningún producto, sin crear la orden ni sus ítems y conservando el carrito.
4. CUANDO se rechaza una orden por stock insuficiente EL SISTEMA DEBERÁ incluir el nombre del producto afectado en el mensaje de error.
5. CUANDO el carrito del usuario está vacío EL SISTEMA DEBERÁ responder HTTP 400 y no crear ninguna orden.
6. EL SISTEMA DEBERÁ impedir en la base de datos que `products.stock` quede negativo.

## REQ-2: Dinero exacto

**Historia de usuario:** Como dueño de la tienda, quiero que los precios y totales no tengan errores de redondeo, para que lo que se cobra coincida con lo que se muestra.

### Criterios de aceptación
1. EL SISTEMA DEBERÁ almacenar `products.price`, `orders.total`, `order_items.unit_price` y `order_items.subtotal` como `numeric(12,2)`.
2. CUANDO se calcula el subtotal o el total de un carrito o de una orden EL SISTEMA DEBERÁ obtener un resultado exacto a dos decimales (por ejemplo, 3 unidades a 0.10 suman 0.30, no 0.30000000000000004).
3. CUANDO la API devuelve un monto EL SISTEMA DEBERÁ enviarlo como número JSON con un máximo de dos decimales, igual que hoy.
4. CUANDO se crea o edita un producto con un precio negativo o con más de dos decimales EL SISTEMA DEBERÁ rechazar la solicitud con HTTP 400.
5. SI un producto del carrito no tiene precio definido o su precio es menor o igual a cero ENTONCES EL SISTEMA DEBERÁ rechazar la orden con HTTP 400, indicando el nombre del producto, sin crear la orden.
6. CUANDO se aplica la migración EL SISTEMA DEBERÁ conservar todos los montos existentes redondeados a dos decimales.
7. CUANDO se revierte la migración EL SISTEMA DEBERÁ restaurar las columnas a su tipo anterior sin perder datos.

## REQ-3: Transiciones de estado válidas

**Historia de usuario:** Como administrador, quiero que una orden solo pueda avanzar por estados coherentes, para no dejar pedidos en situaciones imposibles.

Transiciones permitidas: `PENDING_PAYMENT → PAID`, `PENDING_PAYMENT → CANCELLED`, `PAID → DELIVERED`, `PAID → CANCELLED`. `DELIVERED` y `CANCELLED` son estados finales.

### Criterios de aceptación
1. CUANDO el administrador solicita una transición permitida EL SISTEMA DEBERÁ aplicarla y responder con el `id` y el nuevo estado.
2. CUANDO el administrador solicita una transición no permitida, incluido repetir el estado actual, EL SISTEMA DEBERÁ responder HTTP 409 indicando estado actual y estado pedido, y dejar la orden sin cambios.
3. CUANDO el administrador envía un valor que no pertenece al enum de estados EL SISTEMA DEBERÁ responder HTTP 400.
4. CUANDO la orden no existe EL SISTEMA DEBERÁ responder HTTP 404.
5. CUANDO dos solicitudes de cambio de estado sobre la misma orden llegan a la vez EL SISTEMA DEBERÁ aplicar una sola y rechazar la otra con HTTP 409.
6. CUANDO un usuario que no es ADMIN intenta cambiar un estado EL SISTEMA DEBERÁ responder HTTP 403.

## REQ-4: Devolución de stock al cancelar

**Historia de usuario:** Como dueño de la tienda, quiero recuperar el stock de las órdenes canceladas, para poder venderlo de nuevo.

### Criterios de aceptación
1. CUANDO una orden pasa a `CANCELLED` EL SISTEMA DEBERÁ sumar al stock de cada producto la cantidad de su ítem en esa orden.
2. CUANDO una orden pasa a `CANCELLED` EL SISTEMA DEBERÁ cambiar el estado y devolver el stock en una sola transacción.
3. SI falla la devolución de stock de cualquier ítem ENTONCES EL SISTEMA DEBERÁ dejar la orden en su estado anterior y el stock sin modificar.
4. CUANDO se intenta cancelar una orden ya cancelada EL SISTEMA DEBERÁ rechazarla (REQ-3.2) sin volver a sumar stock.
5. CUANDO una orden pasa a `PAID` o a `DELIVERED` EL SISTEMA DEBERÁ dejar el stock sin modificar.

## REQ-5: Vencimiento automático de órdenes sin pago

**Historia de usuario:** Como dueño de la tienda, quiero que las órdenes sin pagar se cancelen solas pasado un plazo, para que no inmovilicen mi inventario.

### Criterios de aceptación
1. CUANDO una orden en `PENDING_PAYMENT` supera `ORDER_PAYMENT_TTL_HOURS` horas desde su creación EL SISTEMA DEBERÁ pasarla a `CANCELLED` y devolver su stock con las mismas reglas de REQ-4.
2. SI `ORDER_PAYMENT_TTL_HOURS` no está definida ENTONCES EL SISTEMA DEBERÁ usar 48 horas.
3. SI `ORDER_PAYMENT_TTL_HOURS` no es un número mayor que cero ENTONCES EL SISTEMA DEBERÁ usar 48 horas.
4. SI `ORDER_PAYMENT_TTL_HOURS` no es un número mayor que cero ENTONCES EL SISTEMA DEBERÁ registrar una advertencia en el log al arrancar.
5. EL SISTEMA DEBERÁ ejecutar la revisión de vencimientos al menos una vez cada 15 minutos.
6. CUANDO una orden está en `PAID`, `DELIVERED` o `CANCELLED` EL SISTEMA DEBERÁ ignorarla en la revisión de vencimientos, sin importar su antigüedad.
7. CUANDO la revisión falla al procesar una orden EL SISTEMA DEBERÁ registrar el error con el `id` de la orden, sin datos personales del cliente.
8. CUANDO la revisión falla al procesar una orden EL SISTEMA DEBERÁ continuar con las demás órdenes vencidas.
9. CUANDO la revisión se ejecuta dos veces seguidas sobre las mismas órdenes vencidas EL SISTEMA DEBERÁ devolver el stock una sola vez.

## REQ-6: Panel de órdenes coherente con las transiciones

**Historia de usuario:** Como administrador, quiero que el panel solo me ofrezca cambios de estado válidos, para no cometer errores ni ver rechazos inesperados.

### Criterios de aceptación
1. CUANDO el panel muestra una orden EL SISTEMA DEBERÁ ofrecer únicamente los estados a los que esa orden puede pasar según REQ-3.
2. CUANDO una orden está en `DELIVERED` o `CANCELLED` EL SISTEMA DEBERÁ no ofrecer ningún cambio de estado.
3. CUANDO el backend responde HTTP 409 al cambiar un estado EL SISTEMA DEBERÁ mostrar un mensaje de error.
4. CUANDO el backend responde HTTP 409 al cambiar un estado EL SISTEMA DEBERÁ recargar la orden con su estado real.

## Requisitos no funcionales
- NFR-1: Las pruebas de concurrencia (REQ-1.2, REQ-3.5) deben ejecutarse contra un Postgres real; un mock no demuestra el bloqueo.
- NFR-2: La migración debe probarse subiendo y bajando sobre una base con datos de ejemplo antes de darla por buena.
- NFR-3: Ningún mensaje de log ni de error de esta spec debe incluir nombre, email ni dirección del cliente.
- NFR-4: El contrato HTTP existente (rutas, campos actuales de las respuestas exitosas) no cambia; solo se agregan los códigos 409 de REQ-3 y el campo aditivo `allowedTransitions` en las respuestas de órdenes (necesario para REQ-6.1; enmienda hecha durante el diseño).

## Preguntas resueltas
- **PAID → CANCELLED devuelve stock:** sí (decisión del usuario). El reembolso del dinero es manual y queda fuera del sistema.
- **Productos sin precio (REQ-2.5):** se rechazan al ordenar (decisión del usuario).
- **Stock negativo preexistente:** decisión de diseño delegada por el usuario: la migración lo normaliza a 0 antes de crear la restricción (REQ-1.6). Antes de desplegar hay que revisar cuántas filas afecta en producción.

## Verificación final
Recorrida el 2026-10-12 sobre la rama `fix/orders-integrity`. Base de integración: Postgres 16.13 en contenedor efímero (sin volumen, puerto 55432).

**Resultado global:** 37 criterios y 4 NFR cumplidos con evidencia automatizada. **Pendiente (no es un "no cumplido", es verificación humana):** (a) tarea 15, chequeo de datos de producción antes de migrar; (b) verificación manual de REQ-6 en el navegador; (c) observar un disparo real del cron (REQ-5.5).

| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| REQ-1.1 | Sí | integración `orders-integrity`: "descuenta exactamente la cantidad pedida y vacía el carrito" |
| REQ-1.2 | Sí | integración: 10 checkouts simultáneos con stock 3 → 3 órdenes, stock 0, 7 rechazos 400. 5/5 repeticiones estables. Mutación (sin `lock`) → falla |
| REQ-1.3 | Sí | integración: producto que no alcanza → stock de ambos intacto, 0 órdenes, 0 ítems, carrito conservado |
| REQ-1.4 | Sí | integración: el mensaje contiene el nombre del producto (`/No alcanza/`) |
| REQ-1.5 | Sí | integración: carrito vacío → `BadRequestException`, 0 órdenes |
| REQ-1.6 | Sí | test de migración: `UPDATE stock=-1` rechazado por `CHK_products_stock_non_negative`; stock -3 → 0; spec del DTO rechaza stock negativo/decimal (create y update) |
| REQ-2.1 | Sí | test de migración: las 4 columnas son `numeric(12,2)` tras `up` |
| REQ-2.2 | Sí | `money.spec`, `cart.service.spec` (3×0.10 = 0.3) e integración (total `0.30` en la base) |
| REQ-2.3 | Sí | `numeric.transformer.spec`; integración: `total` es `number` 0.3; `cart.service.spec` conserva la forma de la respuesta |
| REQ-2.4 | Sí | `create-product.dto.spec` (create y update): rechaza precio -1 y 1.999; acepta 10.5 |
| REQ-2.5 | Sí | integración: precio `NULL` y `0` → 400 con el nombre, 0 órdenes, stock y carrito intactos |
| REQ-2.6 | Sí | test de migración: 10.555 → 10.56, 2.999 → 3.00, total `0.30`, nulos intactos. Mutación (TRUNC) → falla |
| REQ-2.7 | Sí | test de migración: `down` vuelve a `double precision` conservando 10.56 y 0.3. (Lo normalizado por `up` no es recuperable; documentado en la migración) |
| REQ-3.1 | Sí | integración HTTP: las 4 transiciones permitidas responden 200 con `{id, status, allowedTransitions}` |
| REQ-3.2 | Sí | integración HTTP: 7 transiciones no permitidas (incl. repetir estado) → 409 con ambos estados y orden sin cambios |
| REQ-3.3 | Sí | integración HTTP: estado `ENVIADO` → 400 (ValidationPipe real) |
| REQ-3.4 | Sí | integración HTTP: id inexistente → 404 |
| REQ-3.5 | Sí | integración HTTP determinista (el test retiene el lock): 3 PATCH simultáneos → [200, 409, 409]. Mutación (sin lock) → falla |
| REQ-3.6 | Sí | integración HTTP con `RolesGuard` real: CLIENT y GUEST → 403, orden sin cambios |
| REQ-4.1 | Sí | integración: cancelar desde `PENDING_PAYMENT` y desde `PAID` suma la cantidad de cada ítem |
| REQ-4.2 | Sí | integración: con fallo forzado en el 2.º ítem, el estado no cambia y el stock del 1.º se revierte (misma transacción) |
| REQ-4.3 | Sí | integración: ídem (500, estado `PENDING_PAYMENT`, stocks intactos) |
| REQ-4.4 | Sí | integración: segunda cancelación → 409 y stock sumado una sola vez; también con 3 cancelaciones simultáneas |
| REQ-4.5 | Sí | integración: `PENDING→PAID→DELIVERED` deja el stock igual |
| REQ-5.1 | Sí | integración: cancela la `PENDING_PAYMENT` vencida y devuelve stock; límite 47.9 h no / 48.1 h sí. Mutación (umbral invertido) → falla |
| REQ-5.2 | Sí | unit: sin variable → 48; integración: `ORDER_PAYMENT_TTL_HOURS=1` vence una orden de 2 h que con 48 no vence |
| REQ-5.3 | Sí | unit: `0`, `-1`, `abc`, `""`, `NaN`, `Infinity` y números ≤ 0 → 48 |
| REQ-5.4 | Sí | unit: advertencia que menciona la variable; la app real arrancada con `ORDER_PAYMENT_TTL_HOURS=abc` mostró el `WARN` |
| REQ-5.5 | Sí (parcial) | unit: el decorador usa `0 */10 * * * *` y el intervalo entre disparos es ≤ 15 min. **No se esperó un disparo real de 10 minutos.** |
| REQ-5.6 | Sí | integración: `PAID`, `DELIVERED` y `CANCELLED` viejas no se tocan. Mutación (sin filtro de estado) → falla |
| REQ-5.7 | Sí | unit + integración: log `No se pudo vencer la orden <id>: <mensaje>`, un solo argumento (sin stack), sin email ni nombre del cliente |
| REQ-5.8 | Sí | unit + integración: la orden que falla queda intacta y la siguiente se cancela |
| REQ-5.9 | Sí | integración: 2 ejecuciones seguidas y 2 simultáneas devuelven el stock una vez; una cancelación manual previa no suma doble |
| REQ-6.1 | Sí | Karma: PENDING_PAYMENT → [Pagado, Cancelar]; PAID → [Entregado, Cancelar]; backend: `allowedTransitions` en mapper e integración |
| REQ-6.2 | Sí | Karma: `DELIVERED` y `CANCELLED` no muestran botones y sí el aviso de estado final |
| REQ-6.3 | Sí | Karma: ante un 409 se llama a `NotificationService.error` una vez |
| REQ-6.4 | Sí | Karma: ante un 409 se vuelven a pedir `GET /orders/1` y `GET /orders` y la vista muestra el estado real. Mutación (sin recarga) → falla |

### Requisitos no funcionales
| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| NFR-1 | Sí | Concurrencia probada contra Postgres 16 real (contenedor efímero), no con mocks |
| NFR-2 | Sí | La migración se probó subiendo y bajando con datos de ejemplo, y a mano con `migrations:run` / `migration:revert` |
| NFR-3 | Sí | Los logs de vencimiento solo llevan `id` y `message`; verificado en unit e integración |
| NFR-4 | Sí | `order.mapper.spec` fija las claves exactas de la respuesta; solo se suma `allowedTransitions` |

### Estado de la suite
| Suite | Resultado |
|---|---|
| Backend unitarias (`npx jest`) | 142 verdes y 5 rojos. Los 5 rojos pertenecen a 6 suites de scaffold (`openai`, `auth.controller`, `auth.service`, `mail.service`, `users.controller`, `users.service`) y son **idénticos a la base**: verificado con `git stash` (73 verdes y los mismos 5 rojos antes de esta spec) |
| Backend integración (4 archivos, Postgres real) | 42 de 42 verdes |
| Frontend Karma completa | 8 verdes (7 nuevos) y 5 rojos de scaffold ya conocidos (`App`×2, `AuthFacade`, `LoginForm`, `Profile`) |
| `npm run build` backend y frontend (producción) | OK |
| Lint de los archivos tocados | 0 problemas (los de `cart.controller` y `orders.controller` son anteriores y no se tocaron) |

---
**Estado:** Implementada y verificada con evidencia automatizada. Cierre definitivo condicionado a la tarea 15 y a la verificación manual de la UI.
