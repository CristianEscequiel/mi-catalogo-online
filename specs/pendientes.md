# Pendientes y próximos pasos

Última actualización: 2026-10-13, al cerrar el código de `infra-hardening`. Rama de trabajo: `fix/infra-hardening` (sin commitear todavía).

## 1. Estado de las ramas (revisar primero)

> **2026-10-13:** el usuario confirmó que las secciones 1 (ramas y merge) y 2 (manuales de `orders-integrity` y `catalog-access`) están completas. El detalle original se deja abajo como registro.

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
  - Confirmar que hay un backup reciente antes de aplicar la migración. Anotar los resultados en `specs/orders-integrity/tasks.md`.
- [ ] **UI del panel de órdenes en el navegador:** pasar un pedido `PENDING_PAYMENT` → `PAID` → cancelar, comprobar que no queda ningún botón y provocar un 409 cambiando el estado desde otra pestaña.

### `catalog-access`
- [ ] **Tarea 19, chequeo previo al despliegue.** En producción: `SELECT status, count(*) FROM products GROUP BY status;` y **publicar a mano** (`status = 'PUBLISHED'`) los `DRAFT`/`ARCHIVED` que deban seguir visibles. Después del despliegue el catálogo público solo muestra `PUBLISHED`. Anotar el resultado en `specs/catalog-access/tasks.md`.
- [ ] **UI del home en el navegador** (con el backend local y más de 12 productos publicados): "Cargar más", una búsqueda y su combinación con una categoría.
- [ ] Avisar que `GET /products` cambió de arreglo a `{items,total,page,limit,totalPages}`: cualquier cliente que no sea este frontend tiene que adaptarse.

## 3. `infra-hardening` (tercera spec de la Fase 2): desplegada en producción, faltan 3 comprobaciones

Spec en `specs/infra-hardening/` (requisitos, diseño y tareas aprobados; las 14 tareas obligatorias hechas y el cierre escrito). Cambios sin commitear en la rama local `fix/infra-hardening`, que sale de `fix/catalog-access`. Cuando se pida el commit: código y docs de la spec en commits separados.

**Qué quedó hecho:** `validateEnv` al arrancar (sale con código 1 y lista todo lo que falta o está mal), CORS sin comodín en producción, Swagger apagado en producción, backend `USER node`, frontend `nginx-unprivileged` en el 8080, compose sin puertos publicados más `docker-compose.dev.yml` en loopback, `uploads/` fuera de git y de la imagen, `aide` eliminada.

**Estado en producción (2026-10-13):** backend y frontend corren `sha-c72c55b`, `healthy`; `/`, el SPA y `/api/health` dan 200 y `/api/docs` da 404. El primer intento del CI falló y volvió solo atrás porque `JWT_SECRET` tenía 14 caracteres (se rotó). Detalle en `specs/infra-hardening/tasks.md`, sección "Despliegue en producción".

**Todavía sin comprobar (los hace una persona):**
- [ ] Que el `chown` del volumen se haya aplicado, y **subir una imagen de prueba** desde el panel (si falla con `EACCES`: `docker run --rm -v <nombre real del volumen>:/app/uploads alpine chown -R 1000:1000 /app/uploads`; el nombre se saca con `docker inspect catalog_backend --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{println}}{{end}}'`).
- [ ] Que el puerto 5433 del servidor no responda desde fuera.
- [ ] **Mergear por PR `fix/catalog-frontend-8080` de `web-stack`** (commit `92ce657`: upstream del frontend y su healthcheck al 8080) y dejar el servidor igual a `master` (`git pull`, descartando la edición manual si la hubo). Esa rama no se usa con `git checkout`: le faltan 4 commits de `master`.

**Abierto fuera de alcance (anotado):** `CORS_ORIGIN` por defecto del compose es `http://localhost:8080`; el real lo define `web-stack`. El deploy sigue entrando por SSH como `root@`. Opcionales T15 (verificar `USER node` en el CI) y T16 (`npm audit` informativo) hechos en `ci.yml`, sin commitear y sin haber corrido todavía en Actions. `npm audit` reporta vulnerabilidades preexistentes (backend: 24, 1 crítica; frontend: 15, 2 críticas): candidato para la Fase 3.


## 3b. Plan completo de la auditoría: lo que sigue después de la Fase 2

Origen: la auditoría del 2026-10-12. El informe y el plan por fases están en `C:\Users\Escequiel\.claude\plans\necesito-que-audites-toda-noble-candle.md` (fuera del repo). Estado de cada fase:

| Fase | Contenido | Estado |
|---|---|---|
| 0 y 1 | Seguridad crítica (reset sin token, `/users` sin guards, filtración de tokens, contraseñas, throttling) | Hecha. Commit `aef1d67`, ya en `origin/main` |
| 2 | Integridad del negocio | `orders-integrity` hecha, `catalog-access` hecha, `infra-hardening` código hecho, falta el despliegue (sección 3) |
| 3 | Arquitectura y calidad | Pendiente (abajo) |
| 4 | Features para el e-commerce | Pendiente (abajo) |

### Fase 3: arquitectura y calidad (pendiente)
- Decorador `@CurrentUser()` y presenters / DTOs de respuesta, para dejar de devolver entidades por HTTP. (El mapper único de órdenes ya se hizo en `orders-integrity`.)
- Puertos `MailSender`, `ImageStorage`, `AiContentGenerator` y repositorios por contexto; mover las reglas (límite demo, transiciones de orden) al dominio. Empezar por `ordering` e `identity`.
- Arreglar los tests y el lint y **sacar `continue-on-error` del CI** (hoy los tests no protegen nada).
- Frontend:
  - Servicios de catálogo de lectura pública a `core/data-access` (hoy `home` importa de `catalog-admin`).
  - Una sola fuente de verdad para la sesión (`AuthStore`; hoy `localStorage` se escribe en tres lugares).
  - `OnPush` en todos los componentes y `Profile` con signals.
  - Borrar código muerto (`postItems()`, selector `app-header` en `HomePage`).
  - Decidir SSR: activarlo en `home` y `product/:slug` para SEO, o eliminarlo.

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

- **Backend, suites unitarias que fallan:** `openai.service`, `mail.service`, `auth.service`, `auth.controller`, `users.service`, `users.controller` (5 tests). Más `test/app.e2e-spec.ts`.
- **Frontend, tests que fallan (5):** `App` ×2, `AuthFacade`, `LoginForm`, `Profile`. Causas visibles: falta `provideHttpClient` / Zone.js en la configuración de esos specs.
- **Lint:** `'_imageUrl'` en `category.service.ts` y `'_thumbnailUrl'` en `product.service.ts` (variables sin usar en destructuring).
- **Frontend:** el build avisa que el bundle inicial supera el presupuesto de 800 kB (875 kB).
- Las suites de integración hay que correrlas **en serie** (`npx jest --config test/jest-e2e.json --runInBand`) y con la base descartable (`docker run … postgres:16-alpine`, variables `TEST_DB_*`); en paralelo se pisan los datos.

## 6. Cómo retomar mañana

1. `git checkout fix/catalog-access && git pull` y `git checkout main && git pull` (el local está atrás).
2. Decidir el merge de las ramas (sección 1).
3. Hacer o delegar los manuales de la sección 2.
4. Si se sigue con código: la Fase 3 (arquitectura y calidad, sección 3b) con `sdd-flow`; antes, cerrar el despliegue de `infra-hardening` (sección 3).
5. El plan completo de la auditoría (Fases 3 y 4) está en la sección 3b y en `C:\Users\Escequiel\.claude\plans\necesito-que-audites-toda-noble-candle.md`.
6. Material de estudio de la sesión: `C:\Programs\wiki-claude\sesiones\2026-10-12-catalog-access.html`.
