# Tareas: orders-integrity

Convenciones:
- Rama de trabajo: `fix/orders-integrity` (parte de `fix/security-hardening`, que ya tiene la Fase 1).
- Comandos desde `backend/` salvo indicación. "Tests de integración" = `npx jest --config test/jest-e2e.json test/orders-integrity.e2e-spec.ts` con la base de pruebas levantada (contenedor efímero: `docker run -d --name orders-it-pg -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=orders_it -p 55432:5432 postgres:16-alpine`, con las variables `TEST_DB_*`; **no** usar el servicio `db` del compose: monta el volumen con los datos de desarrollo).
- Los commits se hacen solo cuando el usuario lo pida.
- Todas las tareas son **obligatorias** salvo las marcadas como opcionales.

**Grafo de dependencias (resumen):** 2, 3, 4 y 6 son independientes entre sí y de 1 (se pueden hacer en cualquier orden o en paralelo). 5 depende de 3. 7 depende de 1 y 5. 8 depende de 7. 9 depende de 4. 10 depende de 2, 5, 7 y 9. 11 depende de 2. 12 depende de 4, 7 y 9. 13 depende de 1 y 12. 14 depende de 9 y 12. 15 es manual y se hace antes de desplegar. 16 cierra la spec y depende de todas.

---

## Base

- [x] 1. Preparar rama, dependencia, configuración y runner de integración
  - Detalle: crear `fix/orders-integrity`; `npm i @nestjs/schedule`; agregar `ORDER_PAYMENT_TTL_HOURS` a `src/env.model.ts` y a `backend/.env-example` (comentada, default 48); pasar `ORDER_PAYMENT_TTL_HOURS: ${ORDER_PAYMENT_TTL_HOURS:-48}` en el servicio `backend` de `docker-compose.yml` y documentarla en el `.env-example` de la raíz; agregar `moduleNameMapper` (`^src/(.*)$` → `<rootDir>/../src/$1`) a `test/jest-e2e.json`.
  - Depende de: —
  - Verificación: `npm run build` sin errores; `npx jest --config test/jest-e2e.json --listTests` lista el archivo sin fallar al resolver `src/...`; `docker compose config` en la raíz no marca error.
  - _Requisitos: REQ-5.2 (variable), NFR-1 (preparación)_

## Piezas puras (independientes entre sí)

- [x] 2. Aritmética de dinero en centavos
  - Detalle: crear `src/common/money.ts` con `toCents`, `fromCents`, `lineTotal`, `sumMoney` según el diseño.
  - Depende de: —
  - Verificación: `src/common/money.spec.ts` verde: `lineTotal(0.10, 3) === 0.3`, `sumMoney([0.1, 0.2]) === 0.3`, suma vacía = 0, valores de 2 decimales con 10 dígitos enteros sin pérdida.
  - _Requisitos: REQ-2.2, REQ-2.3_

- [x] 3. Transformer de columnas `numeric`
  - Detalle: crear `src/common/numeric.transformer.ts`.
  - Depende de: —
  - Verificación: `src/common/numeric.transformer.spec.ts` verde: `from('12.50') === 12.5`, `from(null) === null`, `from(undefined) === undefined`, `to(7.25) === 7.25`.
  - _Requisitos: REQ-2.1, REQ-2.3_

- [x] 4. Máquina de estados de la orden
  - Detalle: crear `src/orders/order-status.machine.ts` (`allowedNext`, `canTransition`) con el mapa del diseño.
  - Depende de: —
  - Verificación: `src/orders/order-status.machine.spec.ts` verde con las 16 combinaciones origen × destino (solo las 4 permitidas dan `true`; repetir estado da `false`; `DELIVERED` y `CANCELLED` devuelven lista vacía).
  - _Requisitos: REQ-3.1, REQ-3.2, REQ-6.1, REQ-6.2_

- [x] 6. Validación de precio y stock en el DTO de producto
  - Detalle: en `CreateProductDto` (hereda `UpdateProductDto`): `price` con `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0)`; `stock` con `@IsInt() @Min(0)`.
  - Depende de: —
  - Verificación: `src/product/dto/create-product.dto.spec.ts` verde: rechaza `price: -1`, `price: 1.999`, `stock: -1`, `stock: 1.5`; acepta `price: 10.5`, `stock: 0`; el mismo comportamiento en `UpdateProductDto`.
  - _Requisitos: REQ-2.4, REQ-1.6_

## Datos

- [x] 5. Migración de dinero y `CHECK` de stock, y entidades
  - Detalle: crear `src/database/migrations/1779000000000-orders-money-and-stock-check.ts` (`up`: normalizar `stock < 0` a 0; `ALTER … TYPE numeric(12,2) USING ROUND(col::numeric, 2)` en `products.price`, `orders.total` —con `DROP/SET DEFAULT`—, `order_items.unit_price`, `order_items.subtotal`; `ADD CONSTRAINT CHK_products_stock_non_negative`. `down`: inverso, con encabezado que documenta lo irrecuperable). Cambiar las 4 columnas de las entidades a `{ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer }`.
  - Depende de: 3
  - Verificación: `npm run build` verde; manual sobre la base local: `npm run migrations:run` aplica sin error y `\d products` muestra `numeric(12,2)` y el `CHECK`; `npm run typeorm migration:revert` vuelve a `double precision`. La prueba con datos de ejemplo queda automatizada en la tarea 8.
  - _Requisitos: REQ-1.6, REQ-2.1, REQ-2.6, REQ-2.7_

- [x] 7. Arnés de integración contra Postgres real
  - Detalle: crear `test/orders-integrity.e2e-spec.ts` con el `beforeAll` que lee `TEST_DB_HOST/PORT/NAME/USER/PASSWORD`, crea un `DataSource` con las entidades, ejecuta `runMigrations()` y expone helpers de siembra (usuario, producto, carrito, orden). Si faltan las variables, la suite se omite con un mensaje explícito (`describe.skip` + `console.warn`). Incluir un test de humo (insertar y leer un producto).
  - Depende de: 1, 5
  - Verificación: con la base arriba y las variables definidas, el test de humo pasa; sin las variables, Jest informa la suite como omitida y el aviso aparece en la salida (no un verde silencioso).
  - _Requisitos: NFR-1, NFR-2_

- [x] 8. Prueba de la migración con datos de ejemplo
  - Detalle: en la suite de integración, con la base migrada hasta `1778100000000`, sembrar precios con 3 decimales, un `stock` negativo y un `stock` nulo; correr `up`; comprobar valores; correr `down` y comprobar tipos.
  - Depende de: 7
  - Verificación: la prueba confirma `price 10.555 → 10.56` (o el redondeo que dé Postgres, fijado en el test), `stock -3 → 0`, `stock NULL` sin cambios, inserción de `stock = -1` rechazada por el `CHECK`, y que tras `down` las columnas vuelven a `double precision` conservando los montos.
  - _Requisitos: REQ-1.6, REQ-2.6, REQ-2.7, NFR-2_

## Backend: lógica de órdenes

- [x] 9. Mapper único de órdenes con `allowedTransitions`
  - Detalle: crear `src/orders/order.mapper.ts`; reemplazar las tres copias del mapeo en `orders.service.ts` (`createOrder`, `getOrderById`, `getOrderByIdForRole`) y el resumen de `getAllOrders`; agregar `allowedTransitions` calculado con `allowedNext`. Sin cambiar ningún otro campo ni ruta.
  - Depende de: 4
  - Verificación: `src/orders/order.mapper.spec.ts` verde (orden `PENDING_PAYMENT` → `['PAID','CANCELLED']`, `DELIVERED` → `[]`, resto de campos idénticos al formato actual); `npm run build` verde.
  - _Requisitos: REQ-6.1, REQ-6.2, NFR-4_

- [x] 10. `createOrder` atómico con bloqueo y validaciones
  - Detalle: reescribir `OrdersService.createOrder` según el diseño: carrito sin relaciones ordenado por `productId`; productos con `pessimistic_write` ordenados por `id`; validar precio (>0) y stock antes de escribir; descontar; crear orden e ítems con `lineTotal`/`sumMoney`; vaciar carrito.
  - Depende de: 2, 5, 7, 9
  - Verificación (integración, Postgres real): 10 checkouts simultáneos sobre un producto con stock 3 y 1 unidad cada uno → exactamente 3 órdenes y stock final 0 (REQ-1.2); orden con dos productos donde el segundo no alcanza → stock de ambos intacto, sin orden ni ítems, carrito conservado y el mensaje nombra el producto (REQ-1.3, 1.4); carrito vacío → 400 (REQ-1.5); producto con precio `NULL` o `0` → 400 con nombre y sin orden (REQ-2.5); 3 unidades a 0.10 → total `0.3` en base y respuesta (REQ-2.2, 2.3); orden válida descuenta exactamente lo pedido (REQ-1.1).
  - _Requisitos: REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5, REQ-2.2, REQ-2.3, REQ-2.5_

- [x] 11. Dinero exacto en el carrito
  - Detalle: en `CartService.findAllByUser` usar `lineTotal` y `sumMoney` en lugar de `price * quantity` y `reduce`.
  - Depende de: 2
  - Verificación: `src/cart/cart.service.spec.ts` (repositorios simulados): 3 unidades a 0.10 → `subtotal 0.3`; total de `[0.1, 0.2]` → `0.3`; respuesta con la misma forma que hoy.
  - _Requisitos: REQ-2.2, REQ-2.3_

- [x] 12. Cambio de estado con transiciones válidas y devolución de stock
  - Detalle: implementar `transition` y `restock` privados en `OrdersService` y reescribir `updateStatus` sobre `dataSource.transaction`: lock de la orden, 404, `canTransition` (409 con estado actual y pedido), `restock` solo al pasar a `CANCELLED` (`COALESCE(stock, 0) + :qty`, productos bloqueados por `id` ascendente), guardado.
  - Depende de: 4, 7, 9
  - Verificación (integración): por HTTP con la app Nest, `AuthGuard('jwt')` sobrescrito para inyectar usuario y `RolesGuard` real → ADMIN con transición válida 200 con `allowedTransitions` (REQ-3.1); transición inválida y repetir estado 409 sin cambios (REQ-3.2); estado fuera del enum 400 (REQ-3.3); id inexistente 404 (REQ-3.4); CLIENT 403 (REQ-3.6); dos `PATCH` simultáneos a la misma orden → un 200 y un 409 (REQ-3.5); cancelar `PENDING_PAYMENT` y `PAID` suma el stock de cada ítem (REQ-4.1); estado y stock cambian en una sola transacción y, con un fallo forzado en `restock`, la orden y el stock quedan como estaban (REQ-4.2, 4.3); segunda cancelación → 409 y stock igual (REQ-4.4); `PAID` y `DELIVERED` no tocan el stock (REQ-4.5).
  - _Requisitos: REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.5, REQ-3.6, REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4, REQ-4.5_

- [x] 13. Vencimiento automático de órdenes sin pago
  - Detalle: agregar `OrdersService.expireIfStale`; crear `OrderExpirationService` con `@Cron('0 */10 * * * *')`, lectura de `ORDER_PAYMENT_TTL_HOURS` con fallback a 48 y `warn` si es inválida, consulta de hasta 200 ids con `NOW()` de la base, `try/catch` por orden que loguea solo `id` y `message`; importar `ScheduleModule.forRoot()` en `OrdersModule`.
  - Depende de: 1, 12
  - Verificación: unit `src/orders/order-expiration.service.spec.ts` verde: TTL por defecto 48, valores `0`, `-1`, `abc` → 48 con una advertencia, sin variable → 48 sin advertencia (REQ-5.2 a 5.4); el decorador `@Cron` tiene la expresión `0 */10 * * * *` (REQ-5.5); si falla una orden se loguea el `id` sin datos personales y se procesan las demás (REQ-5.7, 5.8). Integración: con órdenes `PENDING_PAYMENT` vieja y reciente y una `PAID` vieja, `run()` cancela solo la vencida y devuelve su stock (REQ-5.1, 5.6); una segunda ejecución no vuelve a sumar (REQ-5.9). Manual: arrancar la app y ver en el log el registro del job tras 10 minutos, o forzar `run()` desde un script.
  - _Requisitos: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, NFR-3_

## Frontend

- [x] 14. Panel de órdenes con transiciones válidas
  - Detalle: agregar `allowedTransitions` a `OrderResponse` y `OrderSummaryResponse` en `core/services/orders.service.ts`; en `order-admin.page` y su HTML, mostrar el selector con el estado actual deshabilitado más `allowedTransitions` y ocultarlo cuando la lista está vacía; ante `HttpErrorResponse` 409 mostrar el error con `NotificationService` y recargar con `selectOrder` + `loadOrders`.
  - Depende de: 9, 12
  - Verificación: `order-admin.page.spec.ts` (TestBed + `HttpTestingController`) verde: el selector ofrece solo `allowedTransitions` (REQ-6.1), no aparece en `DELIVERED`/`CANCELLED` (REQ-6.2), un 409 muestra el error (REQ-6.3) y vuelve a pedir la orden (REQ-6.4). Manual en el navegador: con el backend local, abrir un pedido `PENDING_PAYMENT` (opciones: Pagado, Cancelado), pasarlo a Pagado (opciones: Entregado, Cancelado), cancelar y comprobar que no queda ningún selector; provocar un 409 cambiando el estado desde otra pestaña.
  - Nota de implementación: se usaron **botones de acción** (uno por transición permitida) en lugar de un `<select>`: un select cuyas opciones cambian con el estado se desincroniza del DOM. La verificación automatizada está hecha (7 tests Karma, con mutaciones que fallan como corresponde); **la verificación manual en el navegador sigue pendiente de hacerla el usuario** (levanta backend + frontend y recorre los 3 estados).
  - _Requisitos: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4_

## Cierre

- [ ] 15. Chequeo previo al despliegue (manual)
  - Detalle: contra la base de producción (solo lectura), ejecutar `SELECT count(*) FROM products WHERE stock < 0;`, `SELECT count(*) FROM products WHERE price >= 1e10 OR price < 0;` y `SELECT count(*) FROM order_items WHERE unit_price >= 1e10;`; anotar los resultados en esta spec. Confirmar que existe un backup reciente antes de aplicar la migración. Recordar que el compose de producción vive en el repo `web-stack`: la variable es opcional y usa 48 por defecto, así que no hace falta tocarlo para desplegar.
  - Depende de: 5
  - Verificación: los tres conteos están anotados y, si el primero es mayor que cero, el usuario confirmó que normalizar a 0 es aceptable; el segundo y el tercero deben dar 0 para que la migración no falle por desborde.
  - _Requisitos: REQ-1.6, REQ-2.6_

- [x] 16. Verificación final de la spec
  - Detalle: correr `npm run build`, `npx eslint` sobre los archivos tocados, `npx jest` (unitarios) y la suite de integración completa; recorrer los 6 REQ criterio por criterio y llenar la tabla "Verificación final" de `requirements.md` con sí/no y evidencia.
  - Depende de: 1 a 15
  - Verificación: la tabla de `requirements.md` está completa; ningún criterio queda sin evidencia; las suites nuevas pasan y las 4 suites de scaffold viejas siguen fallando exactamente igual que antes (no se rompió nada más).
  - Nota: el recorrido de criterios y la tabla de `requirements.md` están hechos. El **cierre definitivo** queda condicionado a la tarea 15 (manual) y a la verificación manual de la UI.
  - _Requisitos: todos_

---
**Estado:** Tareas 1 a 14 y 16 completas. Pendiente: tarea 15 (manual, del usuario) y verificación manual de la UI.
