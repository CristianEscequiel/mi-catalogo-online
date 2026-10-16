# Tareas: frontend-cleanup

Orden pensado para que cada tarea deje el frontend compilando, los tests en verde y, desde T2, **el lint en verde**. Primero se mide la línea base, después se instala ESLint (para que lo demás se haga ya alineado), después los cambios de código por grupo.

Convenciones: `[ ]` pendiente, `[x]` hecha. Todas las tareas son obligatorias. Comandos desde `frontend/` salvo que se indique:
- **Lint:** `npm run lint` (existe desde T1).
- **Tests:** `npx ng test --no-watch --browsers=ChromeHeadless`.
- **Build:** `npm run build -- --configuration production`.

Commits (solo cuando el usuario los pida): código y docs de la spec van **separados**. Rama sugerida: `refactor/frontend-cleanup`, desde `refactor/backend-architecture` (donde ya está la mudanza a `.claude/`) o desde `main` cuando esa rama esté mergeada. Cada test lleva el id del criterio en su nombre (`it('REQ-1.5: ...')`).

## Grupo A: línea base

- [x] **T0. Línea base de tests, build y lint** — REQ-6.1, 7.1, 7.2
  - Con la rama creada y **antes de tocar código**: correr los tests y anotar suites y tests (esperado: todo en verde); correr el build y anotar el total inicial (esperado: 882,43 kB con la advertencia de presupuesto); confirmar que `npm run lint` todavía no existe. Guardar `git diff origin/main --stat -- package.json angular.json` vacío como punto de partida.
  - Depende de: —
  - Verificación: los números anotados en el registro de abajo. Si los tests no están en verde o el total no es ≈882 kB, parar y avisar.

## Grupo B: ESLint (antes de cambiar código)

- [x] **T1. Instalar ESLint y configurarlo** — REQ-9.1, 9.2, 9.6
  - Con `npm view` confirmar las versiones de `eslint`, `typescript-eslint` y `angular-eslint` compatibles con Angular 20.3 y anotarlas. Instalar como `devDependencies` con `npm install -D --legacy-peer-deps ...` (o `ng add angular-eslint`). Crear `eslint.config.js` (plano) con las recomendadas de `typescript-eslint` y de `angular-eslint` para `*.ts` y `*.html`, prefijo `app` en los selectores. **No** activar todavía `prefer-on-push-component-change-detection` (se activa en T19, cuando ya no quedan componentes sin `OnPush`). Agregar el script `"lint"` en `package.json`.
  - Depende de: T0
  - Verificación: `npm run lint` se ejecuta y lista errores (aún no hace falta que dé 0); `git diff origin/main -- package.json` muestra `dependencies` sin cambios y solo `devDependencies` de ESLint y el script `lint`; `npm audit --omit=dev` da el mismo resultado que en T0; `npm run build` y los tests siguen igual que en T0.

- [x] **T2. Dejar el lint en 0 sobre el código actual** — REQ-9.1, 9.3, 9.4
  - Correr `npm run lint`, anotar cuántos errores hay por regla y corregir **el código**, no la configuración. Las excepciones puntuales llevan `eslint-disable-next-line` con el motivo en el mismo comentario. **Parar y volver a la spec** si una sola regla produce una cantidad desproporcionada de errores (decenas de archivos) o si corregir exige cambiar comportamiento.
  - Depende de: T1
  - Verificación: `npm run lint` con código 0; tests y build igual que en T0; `grep -rn "eslint-disable" src` listado y su cantidad anotada en el registro.

- [x] **T3. Lint bloqueante en el CI** — REQ-9.5
  - En `.github/workflows/ci.yml`, job `frontend`: agregar `- run: npm run lint` después de `npm ci` y antes de `npx ng test`, con un comentario que apunte a esta spec. Sin `continue-on-error`.
  - Depende de: T2
  - Verificación: `grep -n "npm run lint" .github/workflows/ci.yml` muestra la línea dentro del job `frontend`, antes de `ng test`; el YAML sigue siendo válido (lectura del archivo). El resultado real en Actions lo confirma una persona al abrir el PR.

## Grupo C: sesión única (REQ-1)

- [x] **T4. `AuthStore.rehydrate` validado y su spec** — REQ-1.1, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9
  - En `core/state/auth.store.ts`: `rehydrate()` valida (token string no vacío, `userLite` JSON con `id` numérico), usa `try/catch` alrededor de `JSON.parse` y, si la sesión es inválida, borra ambas claves y deja el store vacío sin lanzar. Crear `core/state/auth.store.spec.ts`.
  - Depende de: T2
  - Verificación: tests `REQ-1.1` (setAuth guarda), `REQ-1.8`/`REQ-1.9` (clear borra claves y vacía token, usuario y perfil), `REQ-1.3` (sesión válida), `REQ-1.5` (JSON roto), `REQ-1.6` (una sola clave, en las dos variantes) y `REQ-1.7` (las claves quedan borradas); `npm run lint` en 0; build ok.

- [x] **T5. `AuthService.loginUser` sin `localStorage`** — REQ-1.1, 1.2, 1.10
  - Quitar el `tap` que escribe `token`. Crear `features/auth/services/auth.service.spec.ts` y ampliar `auth.facade.spec.ts`.
  - Depende de: T4
  - Verificación: tests `REQ-1.1` en `auth.facade.spec.ts` (un login exitoso llama a `AuthStore.setAuth` con el token y el usuario de la respuesta, y es la única escritura de sesión), `REQ-1.2` (tras un login exitoso del servicio `localStorage` no tiene `token`), `REQ-1.10` (login con 401 y con error de red: ni `localStorage` ni `AuthStore` quedan con sesión); `npm run lint` en 0; tests y build ok.

- [x] **T6. `AuthFacade.hydrate` sin releer `localStorage`, con manejo de error** — REQ-1.3, 1.4, 1.11
  - `hydrate()` toma `store.userLite()`; si hay sesión pide `getUserById(userLite.id)` dentro de `try/catch/finally` (en la falla la sesión sigue y `loadingProfile` vuelve a `false`). `main.ts` no cambia.
  - Depende de: T5
  - Verificación: tests `REQ-1.4` en `auth.facade.spec.ts` (con sesión pide el perfil con el `id` correcto; sin sesión no pide nada; si falla, `loadingProfile` es `false` y la sesión sigue); `grep -rnE "localStorage\.[a-zA-Z]+\(\s*'(token|userLite)'" src/app --include=*.ts` sin specs: solo `core/state/auth.store.ts` (REQ-1.11); `npm run lint` en 0; tests y build ok.

## Grupo D: código muerto (REQ-4)

- [x] **T7. Borrar la cadena `postItems` y renombrar el selector de `HomePage`** — REQ-4.1, 4.2, 4.3, 4.4
  - Borrar `LoginForm.postItems`, `AuthFacade.newPost` y `AuthService.postItems`, y los imports que queden sin uso. Cambiar `selector` de `HomePage` a `app-home-page`. No tocar `AuthStore.rehydrate` ni `main.ts`.
  - Depende de: T2 (independiente de T4–T6)
  - Verificación: `grep -rn "postItems\|newPost\|/posts" src/app` (sin specs) vacío; `grep -rn "selector: 'app-header'" src/app` solo en `shared/header/header.ts`; `grep -n "rehydrate" src/main.ts` una coincidencia; `npm run lint` en 0; tests y build ok.

## Grupo E: `core/data-access` (REQ-5)

- [x] **T8. Mover servicios y modelos de lectura pública a `core/data-access`** — REQ-5.1, 5.2, 5.3, 5.4
  - Con `git mv`: `product.service.ts` (+ `.spec.ts`), `prd-res.model.ts` y `product.model.ts` → `core/data-access/products/`; `category.service.ts` y `category.model.ts` → `core/data-access/categories/`. Actualizar los imports en `home`, `product-detail`, `core/services/favorites.service.ts` y en todo `catalog-admin`. Crear `category.service.spec.ts` (mismas rutas, métodos y cuerpos que hoy). No cambiar el contenido de los servicios.
  - Depende de: T2
  - Verificación: `grep -rn "catalog-admin" src/app/features/home src/app/features/product-detail src/app/core` vacío (REQ-5.3); `product.service.spec.ts` movido y en verde y `category.service.spec.ts` con un `it('REQ-5.4: ...')` por método HTTP; `npm run lint` en 0; tests y build ok.

- [x] **T9. Pruebas de estados de `home`/detalle y de los roles del admin** — REQ-5.5, 5.6
  - `home-page.spec.ts`: estados loading, vacío y error. Un spec para `product-detail-page` si hoy no cubre esos tres estados. `auth-guard.spec.ts`: `ADMIN` y `GUEST` pasan en las rutas de `admin/product` y `admin/category`; `CLIENT` rebota a `/home`; `admin/orders` solo deja pasar a `ADMIN`; sin sesión va a `/login`.
  - Depende de: T8
  - Verificación: los tests nombrados con `REQ-5.5` y `REQ-5.6` en verde; `npm run lint` en 0; build ok.

## Grupo F: bundle bajo el presupuesto (REQ-6)

Cada paso termina midiendo el build y anotando el total inicial. **Se para en cuanto el total es de 800 kB o menos** (los pasos siguientes no se hacen). Si tras T12 sigue sobre 800 kB, se para y se vuelve a la spec (plan B).

> **Resultado (2026-10-16):** T10 sola llevó el total a **794,27 kB** (era 882,07). T11 y T12 quedan como **contingencia**: se hacen solo si una tarea posterior (`OnPush`, `Profile`) o el build de T22 vuelve a mostrar el total sobre 800 kB. Las tareas que dependían de T12 ahora dependen de T9 y T13 (ver diagrama).

- [x] **T10. Rutas de administración perezosas, con un spec de la configuración real de rutas** — REQ-6.1, 6.3, 5.6
  - **Primero** crear `app.routes.spec.ts`, que lee el arreglo real `routes` y comprueba `canActivate` (con `authGuard`) y `data.roles` de `admin/product` (`ADMIN`, `GUEST`), `admin/category` (`ADMIN`, `GUEST`), `admin/orders` (`ADMIN`) y que `checkout`, `checkout/success` y `profile` tienen `authGuard`. El spec debe pasar **antes** del cambio. Después, en `app.routes.ts`, `admin/product`, `admin/category` y `admin/orders` pasan a `loadComponent: () => import(...)`, conservando `canActivate`, `data.roles` y `pathMatch`.
  - Depende de: T8, T9
  - Verificación: `app.routes.spec.ts` en verde antes y después del cambio (`it('REQ-5.6: ...')` por ruta); `auth-guard.spec.ts` en verde; build: total inicial anotado (esperado ≈ 65 kB menos); `npm run lint` en 0; tests ok.

- [ ] **T11 (contingencia, no necesaria por ahora). Páginas de autenticación perezosas** — REQ-6.1, 6.3
  - `check-email`, `forgot-password`/`request-password-reset`, `reset-password` y `verify-email` con `loadComponent`. `login` y `register` quedan eager.
  - Depende de: T10
  - Verificación: build: total inicial anotado (acumulado esperado ≈ 81 kB menos); `app.routes.spec.ts` sigue en verde; `npm run lint` en 0; tests ok.

- [ ] **T12 (contingencia, no necesaria por ahora). `cart`, `checkout`, `checkout/success` y `profile` perezosos** — REQ-6.1, 6.3
  - Mismo cambio, conservando `canActivate` en las rutas que lo tienen (`checkout`, `checkout/success`, `profile`).
  - Depende de: T11
  - Verificación: build: total inicial ≤ 800 kB y sin la advertencia de presupuesto (REQ-6.1); `app.routes.spec.ts` sigue en verde (guards de `checkout` y `profile` intactos); `git diff origin/main -- angular.json` sin cambios en `budgets` (REQ-6.4); `npm run lint` en 0; tests ok.

## Grupo G: `OnPush` y `Profile` (REQ-2, 3)

**Orden:** hojas primero y padres después; un componente solo pasa a `OnPush` cuando todo su subárbol ya es seguro (diseño D2). Para cada componente de un grupo: (1) inventariar los campos que cambian por eventos, HTTP o temporizadores y que usa la plantilla, y pasarlos a `signal`/`computed`; (2) agregar `changeDetection: ChangeDetectionStrategy.OnPush`; (3) agregar un test con `detectChanges` para cada componente con estado mutable.

- [x] **T13. `OnPush` en las hojas de `shared/`** — REQ-2.1, 2.2, 2.3
  - `header`, `toast-container`, `confirm-dialog` e `image-field`. **`layout` y `app.ts` ya no van aquí:** pasan a T17b, porque son ancestros de todas las pantallas (ver diseño D2).
  - Depende de: T2
  - Verificación: tests `REQ-2.2` para los que tienen estado mutable; `npm run lint` en 0; tests y build ok.

- [x] **T14. `OnPush` en `auth`** — REQ-2.1, 2.2, 2.3
  - `login-form` (incluye `isLoading`, que hoy es un campo común) y `register-form`.
  - Depende de: T7, T13
  - Verificación: tests `REQ-2.2` en `login-form.spec.ts` y `register-form`; `npm run lint` en 0; tests y build ok.

- [x] **T15. `OnPush` en `cart`, `checkout`, `home` y `product-detail`** — REQ-2.1, 2.2, 2.3
  - `cart-page`, `checkout-page`, `checkout-success-page`, `home-page`, `product-detail-page`.
  - Depende de: T9, T13
  - Verificación: tests `REQ-2.2` en los specs de esos componentes (`home-page.spec.ts` ya existe); `npm run lint` en 0; tests y build ok.

- [x] **T16a. `OnPush` en el admin de productos** — REQ-2.1, 2.2, 2.3
  - Los 5 componentes de `catalog-admin/products`: `product-admin.page`, `product-form`, `product-form-dialog`, `product-list`, `product-warn-dialog`. En el inventario previo, anotar cuáles tienen estado mutable.
  - Depende de: T13
  - Verificación: un test `REQ-2.2` por cada componente del inventario con estado mutable (en los specs existentes `product-form`, `product-list` o nuevos); `npm run lint` en 0; tests y build ok.

- [x] **T16b. `OnPush` en el admin de categorías, órdenes y `shared`** — REQ-2.1, 2.2, 2.3
  - Los 9 componentes restantes de `catalog-admin`: `category-admin.page`, `category-form`, `category-form-dialog`, `category-list`, `category-warn-dialog`, `order-admin.page`, `admin-toolbar`, `category-mobile-card`, `product-mobile-card`. Inventario previo de estado mutable.
  - Depende de: T13
  - Verificación: un test `REQ-2.2` por cada componente del inventario con estado mutable (`order-admin.page.spec.ts` y `product-mobile-card` ya existen); `npm run lint` en 0; tests y build ok.

- [x] **T17. `Profile` con signals y `OnPush`** — REQ-3.1 a 3.11, 2.1
  - Según el diseño D3: `selectedImageFile`, `imageError`, `isUploadingImage`, `isDeletingImage` y `enableEdit` como `signal`; `profile` y `avatar` como `computed`; `effect()` que copia el perfil al formulario solo si `enableEdit()` es `false`.
  - Depende de: T13
  - Verificación: en `profile.spec.ts`, un `it` por criterio (`REQ-3.1` a `REQ-3.11`), incluido «subir imagen durante la edición no pisa los campos del formulario»; `npm run lint` en 0; tests y build ok.

- [x] **T17b. `OnPush` en `layout` y `app.ts`** — REQ-2.1, 2.2
  - Solo cuando todas las pantallas ya son seguras. `App` y `Layout` no tienen estado propio (solo el `signal` `title` de `App`).
  - Depende de: T14, T15, T16a, T16b, T17
  - Verificación: el humo parcial de T20 (login, perfil, admin) con `OnPush` en la raíz; `npm run lint` en 0; tests y build ok.

- [x] **T18. Verificar `OnPush` en todos los componentes** — REQ-2.1
  - Comprobar que ningún componente quedó sin `OnPush`.
  - Depende de: T17b
  - Verificación (con Bash, sintaxis POSIX): `grep -rL "changeDetection: ChangeDetectionStrategy.OnPush" $(grep -rl "@Component" src/app --include=*.ts | grep -v spec)` vacío; el patrón completo evita que un import sin uso cuente como `OnPush`.

- [x] **T19. Activar la regla de `OnPush` en ESLint** — REQ-2.4, 9.2
  - Agregar `@angular-eslint/prefer-on-push-component-change-detection` como `error` en `eslint.config.js`.
  - Depende de: T18
  - Verificación: `npm run lint` en 0; prueba manual: quitar `OnPush` de un componente, `npm run lint` debe fallar con esa regla, y revertir el cambio; anotar el resultado.

## Grupo H: cierre

- [ ] **T20. Humo manual en el navegador** — REQ-7.4, 6.2, 6.3
  - Lo hace una persona con el backend local y el frontend ya con todo aplicado (`OnPush`, rutas perezosas y `Profile`). Resultado esperado de cada paso:
    1. Login con credenciales válidas deja la sesión abierta, y recargar la página la mantiene.
    2. El home lista productos y filtra por búsqueda y por categoría.
    3. El detalle muestra el producto elegido.
    4. El carrito suma y quita ítems.
    5. Un favorito se marca y sigue marcado tras recargar.
    6. El perfil muestra los datos, permite subir y borrar la imagen, y subirla mientras se edita no pisa los campos.
    7. El panel admin lista, crea y edita un producto, y abre `categories` y `orders`.
    8. La consola no muestra errores en `/home` ni en las rutas del admin.
    9. Con `localStorage.userLite` roto a mano, la app arranca sin sesión y las claves quedan borradas.
  - Depende de: T18
  - Verificación: cada paso del humo anotado con su resultado en el registro.

- [x] **T21. Documentación** — REQ-8.1, 8.2, 8.3, 8.4
  - `.claude/specs/pendientes.md` (estado de la Fase 3, lo abierto del frontend y la duplicación de providers entre `main.ts` y `app.config.ts`); `.claude/steering/structure.md` (`core/data-access`, `AuthStore` como única fuente de sesión); `.claude/steering/tech.md` y la sección «Comandos» de `CLAUDE.md` (ESLint y `npm run lint` en el frontend).
  - Depende de: T19
  - Verificación: lectura de los cuatro archivos; `grep -rn "core/data-access" .claude/steering/structure.md` y `grep -n "npm run lint" CLAUDE.md` con coincidencias.

- [ ] **T22. Cierre de la spec** — todos
  - Recorrer cada criterio de `requirements.md` con `spec-verifier` y anotar sí/no con evidencia abajo; correr `npm run lint`, los tests y el build; revisar `git diff origin/main` de `package.json` (REQ-7.3, 9.6) y `angular.json` (REQ-6.4); anotar la cantidad de `eslint-disable` (REQ-9.4). Después, PR y el resultado del CI en Actions (lo informa una persona).
  - Depende de: T3, T20, T21
  - Verificación: tabla «Cierre de criterios» completa; ningún criterio en NO.

## Dependencias y paralelismo

```
T0 → T1 → T2 ─┬→ T3 ──────────────────────────────┐
              ├→ T4 → T5 → T6                      │
              ├→ T7                                │
              ├→ T8 → T9 → T10 ┄┄► T11 → T12      │  (T11 y T12: contingencia)
              └→ T13 ─┬→ T14 (necesita T7)         │
                      ├→ T15 (necesita T9)         │
                      ├→ T16a                      │
                      ├→ T16b                      │
                      └→ T17                       │
T14, T15, T16a, T16b, T17 → T17b → T18 → T19 → T21 ┤
T18 → T20 ────────────────────────────────────────┴→ T22
```

Independientes entre sí tras T2: la cadena **T4→T6**, **T7**, la cadena **T8→T12** y **T13**. T3 puede hacerse en cualquier momento después de T2 y T22 lo espera.

## Registro

*(se completa al ejecutar cada tarea)*

### Línea base (T0), 2026-10-16
Rama `refactor/frontend-cleanup`, creada desde `refactor/backend-architecture` (`a6e3d71`). Sin cambios de código todavía.

| Comprobación | Resultado |
|---|---|
| `npx ng test --no-watch --browsers=ChromeHeadless` | **38 tests en verde** (11 archivos `.spec.ts`), 0 fallidos |
| `npm run build -- --configuration production` | código 0; `main` 782,73 kB + `styles` 99,70 kB = **882,43 kB** inicial; advertencia: presupuesto de 800 kB excedido por 82,43 kB |
| `npm run lint` | `Missing script: "lint"` (no existe todavía, como se esperaba) |
| `git diff origin/main -- package.json angular.json` | vacío |

Los números coinciden con lo esperado (REQ-6.1 y REQ-7.1 parten de aquí).

### ESLint instalado (T1), 2026-10-16
- **Versiones** (elegidas con `npm view`): `eslint@^9.39.5`, `typescript-eslint@^8.71.2`, `angular-eslint@^20.7.0`, todas en `devDependencies`. La última `angular-eslint` es la 22.x (para Angular 22) y `eslint` 10.x; se descartaron porque `angular-eslint` 20 declara `eslint: ^8.57.0 || ^9.0.0`. Instaladas con `npm install -D --legacy-peer-deps`.
- **Configuración:** `frontend/eslint.config.js` (plana): recomendadas de `eslint`, `typescript-eslint` y `angular-eslint` (`tsRecommended` y `templateRecommended`, con `processInlineTemplates`), prefijo `app` en selectores. Sin la regla de `OnPush` (se activa en T19). Ignora `dist`, `.angular`, `node_modules` y `public`.
- **Script:** `"lint": "eslint \"src/**/*.{ts,html}\""` (CLI directo, sin tocar `angular.json`).
- **Verificación:** `npm run lint` se ejecuta y reporta **47 errores en 16 de 106 archivos**: `prefer-inject` 20, `no-explicit-any` 14, `no-unused-vars` 11, `no-output-native` 2 (insumo de T2). `npm audit --omit=dev`: 0 vulnerabilidades (igual que antes). Build: 882,43 kB, código 0, igual que T0. Tests: 38 en verde. `git diff origin/main -- package.json`: `dependencies` sin cambios; solo las tres `devDependencies` y el script `lint`.

### Lint en 0 (T2), 2026-10-16
De 47 errores en 16 archivos a **0** (`npm run lint`, código 0), corrigiendo el código y sin tocar `eslint.config.js`.

| Regla | Errores | Qué se hizo |
|---|---|---|
| `prefer-inject` | 20 | Los 5 diálogos (`category-form-dialog`, `category-warn-dialog`, `product-form-dialog`, `product-warn-dialog`, `confirm-dialog`) pasaron de inyección por constructor a `inject()`; se quitó `Inject` de los imports |
| `no-explicit-any` | 14 | `product.service.ts` (9): `ProductResModel`, `ProductResModel[]`, `unknown` y el nuevo tipo `GeneratedProductContent` (`description`, `slug`); `auth.facade.ts` (2): función `toUserProfile`; `header.ts` (1): `userProfile()?.avatar`; `product-detail-page.ts` (1): `catch (error)` con `instanceof HttpErrorResponse`; `auth.service.ts` (1): `post<unknown>` en `postItems`, que T7 borra |
| `no-unused-vars` | 11 | Imports sin uso en `auth.store`, `auth.service`, `profile` y `product-warn-dialog`; parámetro `state` de `loginGuard`; parámetro `_trigger` de `Header.removeItem` (la plantilla no lo pasaba); 1 excepción (ver abajo) |
| `no-output-native` | 2 | `@Output() cancel` → `cancelled` en `category-form` y `product-form`, con sus plantillas y los dos diálogos que los usan |

- **Excepciones `eslint-disable`: 1.** `product-list.component.ts:145`, `onView(row)`: stub «Todo» de la vista de detalle del admin; la plantilla le pasa `row`. Con motivo en el comentario (REQ-9.4).
- **Cambio observable que conviene saber:** `AuthStore.userProfile` ahora trae `id` y `email`. Antes se guardaba `profile.profile` casteado con `as any`, sin esos dos campos aunque el tipo `UserProfile` los declara. Nadie leía esos campos, pero el dato ahora es el que el tipo promete.
- **Un tropiezo útil:** el primer intento dejó el build en rojo (`Cannot find name 'data'` en `category-form-dialog`, porque el cuerpo del constructor usaba `data` como variable local) con el lint en verde. Se corrigió y se anota que el lint **no reemplaza** al build ni a los tests: en cada tarea se corren los tres.
- **Verificación:** lint código 0; build código 0, 882,17 kB (era 882,43 kB; la advertencia de 800 kB sigue hasta T10 a T12); 38 tests en verde; `grep -rn "eslint-disable" src`: 1 coincidencia, con motivo.
- **Pendiente para el humo (T20):** abrir los diálogos de crear/editar/borrar de productos y categorías, porque cambiaron su inyección y el nombre del output `cancelled`; no hay tests que los cubran.

### Lint en el CI (T3), 2026-10-16
- `.github/workflows/ci.yml`, job `frontend`: se agregó `- run: npm run lint` entre `npm ci` y `ng test`, con un comentario que apunta a esta spec. Sin `continue-on-error`. El job queda: `npm ci` → `lint` → `ng test` → `build` → `npm audit` (informativo) → `npm audit --audit-level=critical`.
- **Riesgo comprobado antes de tocar el CI:** ESLint se instaló con `--legacy-peer-deps`, pero el CI corre `npm ci` sin esa bandera. Se probó `npm ci --dry-run` sobre una copia de `package.json` y `package-lock.json` en un directorio aparte: sale con código 0 (785 paquetes), igual que la versión anterior sin ESLint (684 paquetes). El lock es consistente para el CI.
- **Verificación:** `grep -n "npm run lint" .github/workflows/ci.yml` → línea 86, antes de `ng test` (línea 87); el YAML se parseó con `js-yaml` y la lista de pasos es la de arriba; el paso del lint no tiene `continue-on-error`.
- **Sin comprobar todavía:** que el job pase en GitHub Actions. Lo confirma una persona al abrir el PR (T22).

### `AuthStore.rehydrate` validado (T4), 2026-10-16
- **Spec nuevo** `core/state/auth.store.spec.ts`, 11 tests con el id del criterio en el nombre: REQ-1.1 (setAuth guarda en store y en `localStorage`), REQ-1.3 (sesión válida), REQ-1.5 (JSON roto: no lanza y no hay sesión), REQ-1.6 (solo token, solo userLite, userLite sin `id` numérico), REQ-1.7 (JSON roto, falta una clave y sin nada guardado), REQ-1.8 y REQ-1.9 (clear).
- **Rojo antes de implementar:** con el código anterior fallaban 4 de los 11 (JSON roto lanzaba; `userLite` sin `id` se restauraba; las claves inválidas no se borraban, en dos casos). Con la implementación pasan los 11.
- **Implementación** (`core/state/auth.store.ts`): `rehydrate()` lee las dos claves, valida con `parseUserLite` (JSON parseable, objeto y `id` numérico) y exige token no vacío; si la sesión es inválida llama a `removeStoredSession()` y deja el store vacío sin lanzar. `clear()` reutiliza el mismo método privado. Si no hay nada guardado, no toca `localStorage`.
- **Verificación:** `npm run lint` código 0; build código 0 (882,42 kB, igual que antes; sigue la advertencia hasta T10 a T12); tests: **49 en verde** (38 previos + 11 nuevos).
- **Sin cubrir aquí:** que `main.ts` llame a `rehydrate()` como `APP_INITIALIZER` no tiene test; lo cubre la comprobación `grep -n "rehydrate" src/main.ts` de REQ-4.4 en T7.

### `AuthService.loginUser` sin `localStorage` (T5), 2026-10-16
- **Tests nuevos (5):** `auth.service.spec.ts` (nuevo): `REQ-1.2` (login exitoso devuelve la respuesta y `localStorage` queda vacío) y `REQ-1.10` (401 propaga el error y no escribe). `auth.facade.spec.ts` (ampliado, con un `Router` falso y `HttpTestingController`): `REQ-1.1` (un login exitoso llama a `setAuth` una vez con el token y el usuario de la respuesta y las únicas escrituras en `localStorage` son `['token', 'userLite']`), y `REQ-1.10` dos veces en el facade (401 y error de red: rechaza con `LOGIN_FAILED`, `setAuth` no se llama, store y `localStorage` vacíos).
- **Rojo antes de implementar:** fallaban 2 de los 5. `REQ-1.1` veía 3 escrituras (`token` dos veces, una del servicio y otra del store, más `userLite`) y `REQ-1.2` encontraba `'jwt-1'` en `localStorage`. Los dos casos de login fallido ya pasaban: el facade ya solo llamaba a `setAuth` tras el éxito.
- **Implementación** (`auth.service.ts`): se quitó el `tap` que hacía `localStorage.setItem('token', ...)` y el import `tap`; queda un comentario que dice que la sesión la guarda `AuthStore.setAuth`.
- **Verificación:** lint código 0; build código 0 (882,36 kB); tests **54 en verde** (49 + 5).
- **Anotado, fuera de alcance:** `LoginResponse.user.id` está tipado como el literal `1` (`login-res.model.ts`) y no trae `role`, aunque el store y los guards leen `userLite.role`. No se toca aquí: el tipo no se usa de forma que cambie el comportamiento y arreglarlo pide revisar el contrato con el backend. Candidato a una spec posterior.

### `AuthFacade.hydrate` (T6), 2026-10-16
- **Tests nuevos (4)** en `auth.facade.spec.ts`, bloque `hydrate`: `REQ-1.3` (no llama a `localStorage.getItem`), `REQ-1.4` con sesión (pide `GET /users/7` con el `id` de `userLite`, guarda el perfil con `id`, `email`, `name`, `lastName` y `avatar`, y `setLoadingProfile` se llama `true` y luego `false`), `REQ-1.4` sin sesión (no pide nada) y `REQ-1.4` con falla del perfil (500: `hydrate` no rechaza, la sesión sigue, el perfil queda `null` y `setLoadingProfile` termina en `false`).
- **Rojo antes de implementar:** fallaban 2 de los 4 (`REQ-1.3` y el caso de la falla); los otros dos pasaban con el código anterior.
- **Implementación** (`auth.facade.ts`): `hydrate()` toma `store.userLite()` y `store.token()` (que restauró `rehydrate()` en el `APP_INITIALIZER` de `main.ts`), ya no lee `localStorage` ni vuelve a llamar a `setAuth`, y envuelve la carga del perfil en `try/catch/finally`: en la falla escribe un `console.error` y la sesión sigue.
- **Corrección a lo que decían el diseño y la spec:** `AuthStore._loadingProfile` es de **solo escritura**: nadie lo lee ni lo expone. El «flag atascado en `true`» no era observable. Lo que sí era observable es que `hydrate()` **rechazaba la promesa** sin que `main.ts` la atrapara (rechazo no manejado en el arranque). El cambio sigue siendo correcto, pero su beneficio real es ese rechazo; el flag se prueba por el orden de llamadas de `setLoadingProfile`. Queda anotado que `loadingProfile` es una señal sin lector (candidata a borrarse o a usarse en una spec posterior).
- **`grep` de REQ-1.11 corregido** en el diseño y en T6: el patrón anterior (`'token'` suelto) también atrapaba `queryParamMap.get('token')`. El patrón correcto es `localStorage\.[a-zA-Z]+\(\s*'(token|userLite)'`: da 6 coincidencias, todas en `core/state/auth.store.ts`. `theme.service.ts` usa otra clave y en `auth.service.ts` solo queda un comentario.
- **Verificación:** lint código 0; build código 0 (882,36 kB); tests **58 en verde** (54 + 4).

### Código muerto (T7), 2026-10-16
- **Borrado:** `LoginForm.postItems()`, `AuthFacade.newPost()` y `AuthService.postItems()` (el `POST /posts` con el texto de prueba). Ninguna plantilla ni spec los usaba. El selector de `HomePage` pasó de `app-header` a `app-home-page`.
- **Verificación de los criterios:** `grep -rn "postItems\|newPost\|/posts" src/app` (sin specs) → vacío (REQ-4.1, 4.2); `grep -rn "selector: 'app-header'" src/app` → solo `shared/header/header.ts:15` (REQ-4.3); `grep -n "rehydrate" src/main.ts` → `store.rehydrate()` en la línea 15, dentro del `APP_INITIALIZER` (REQ-4.4; el `grep` da 3 líneas porque también coincide el nombre `rehydrateStore`, no solo una).
- **Verificación:** lint código 0 (sin imports huérfanos: `firstValueFrom` y `authService` siguen en uso en el facade); build código 0 (**882,07 kB**, 0,3 kB menos); tests **58 en verde**, sin cambios.
- **Sin test propio:** el renombre del selector no tiene test porque ninguna plantilla usa la etiqueta `<app-home-page>` (la pantalla se carga por ruta); lo cubre el `grep`.

### `core/data-access` (T8), 2026-10-16
- **Movido con `git mv`** (git los detecta como renombres, el historial se conserva): `product.service.ts`, `product.service.spec.ts`, `prd-res.model.ts` y `product.model.ts` → `core/data-access/products/`; `category.service.ts` y `category.model.ts` → `core/data-access/categories/`. El contenido de los servicios y modelos no cambió salvo sus imports.
- **Imports:** un script calculó todas las rutas nuevas antes de mover y reescribió **41 imports en 22 archivos** (admin, `home`, `product-detail`, `favorites.service` y specs). `home` y `product-detail` ya no dependen de `catalog-admin`.
- **Criterios:** `grep -rn "catalog-admin" src/app/features/home src/app/features/product-detail src/app/core` → vacío (REQ-5.3); `grep -rn "features/" src/app/core/data-access` → vacío (la dependencia va de `features/` a `core/`, no al revés); `favorites.service.ts` importa el modelo desde `core/` (REQ-5.2).
- **Tests nuevos (17)**, de caracterización: no cambian nada, fijan el contrato HTTP actual para que un cambio futuro de ruta, método o cuerpo haga fallar un test. `category.service.spec.ts` (nuevo): 7 `it('REQ-5.4: …')`, uno por método. `product.service.spec.ts` (el movido): +10 `it('REQ-5.4: …')` para los métodos que no tenían test (`getProductById`, `getProductBySlug` con el slug codificado, `postProduct`, `getProductsByUserId`, `getDescriptionByAi`, `generateFromImage`, `editProduct`, `deleteProduct`, `uploadProductImage` y `deleteProductImage`). Se agregaron los de `ProductService` más allá de lo que pedía la tarea porque su spec solo cubría `getProductsPage` y REQ-5.4 quedaba sin evidencia para el resto.
- **Verificación:** lint código 0; build código 0 (882,07 kB, igual que antes: un movimiento no cambia el tamaño); tests **75 en verde** (58 + 17).
- **Anotado:** se movió cada servicio entero (lectura y escritura), como decidió el diseño; partirlo en uno de lectura y otro de administración queda como mejora futura.

### Estados y roles (T9), 2026-10-16
Solo tests, sin cambios de código de producción. Son de caracterización: pasan desde el principio y fijan el comportamiento actual.
- **`home-page.spec.ts` (+1):** `REQ-5.5` estado de carga: mientras llega la primera página hay esqueletos (`.skeleton`) y ningún producto, y desaparecen al responder. Los estados **vacío** y **error con «Reintentar»** de `home` ya tenían test desde `catalog-admin` (`REQ-6.8` y `REQ-6.9` de esa spec, líneas «sin resultados muestra el estado vacío» y «si falla la carga muestra el error…»); no se duplicaron.
- **`product-detail-page.spec.ts` (nuevo, +4):** `REQ-5.5` carga (esqueleto y sin producto), producto cargado (nombre visible y sin esqueleto), no encontrado con 404 («Producto no encontrado» y enlace «Volver al catálogo» a `/home`) y error con 500 («No se pudo cargar el producto», sin el texto de no encontrado). Para el detalle, «vacío» equivale a no encontrado.
- **`auth-guard.spec.ts` (+9):** `REQ-5.6`: en `admin/product` y `admin/category` (roles `ADMIN`, `GUEST`) pasan `ADMIN` y `GUEST` y `CLIENT` rebota a `/home`; en `admin/orders` (`ADMIN`) pasa `ADMIN` y rebotan `GUEST` y `CLIENT`; sin sesión redirige a `/login` con `returnUrl` y `authRequired=1`; una ruta sin `data.roles` solo exige sesión; si `userLite` no trae rol se toma del payload del JWT. El spec solo tenía `should be created`.
- **Un tropiezo menor:** el primer intento del test de «no encontrado» falló por mi selector (`a[href="/home"]` agarraba un enlace «Inicio» anterior); se corrigió buscando el enlace por texto. El componente estaba bien.
- **Límite que queda anotado:** el spec del guard usa listas de roles copiadas de `app.routes.ts`, así que prueba el guard pero no la configuración real de las rutas. Eso lo cubre `app.routes.spec.ts` en T10, que lee el arreglo `routes` de verdad.
- **Verificación:** lint código 0; build código 0 (882,07 kB, sin cambios); tests **89 en verde** (75 + 14).

### Rutas del admin perezosas (T10), 2026-10-16
- **Spec nuevo** `app.routes.spec.ts` (10 tests, `REQ-5.6`): lee el arreglo real `routes` y comprueba que `admin/product` y `admin/category` tienen `canActivate: [authGuard]` y roles `['ADMIN', 'GUEST']`, que `admin/orders` tiene `authGuard` y `['ADMIN']`, que las tres conservan `pathMatch: 'full'`, que `checkout`, `checkout/success/:orderId` y `profile` tienen `authGuard`, y que `home`, `product/:slug` y `cart` no lo exigen. **Pasó antes del cambio** (99 tests en verde) y **pasa después**.
- **Cambio** (`app.routes.ts`): `admin/product`, `admin/category` y `admin/orders` pasan de `component:` a `loadComponent: () => import(…).then(m => m.…)`, con `canActivate`, `data.roles` y `pathMatch` intactos; se quitaron los tres imports estáticos.
- **Medición del build:** total inicial **794,27 kB** (era 882,07): `main` 229,48 kB + `styles` 99,70 kB + los chunks iniciales compartidos; **sin la advertencia de presupuesto** (REQ-6.1). Bajó 87,8 kB, más que los ~65 kB estimados, porque con las pantallas del admin se fue parte de CDK `Dialog`. Chunks perezosos nuevos: `product-admin-page` 36,82 kB, `category-admin-page` 16,97 kB, `order-admin-page` 11,70 kB y uno compartido de 27,79 kB.
- **`git diff -- angular.json`:** vacío (REQ-6.4).
- **Margen:** 5,73 kB bajo el presupuesto. Es poco; el build de T22 lo vuelve a medir y, si se pasara de 800 kB, se hacen T11 y T12.
- **Verificación:** lint código 0; build código 0; tests **99 en verde** (89 + 10).

### `OnPush` en las hojas de `shared/` (T13), 2026-10-16
- **Corrección de la spec al empezar (algo no contemplado):** el plan original ponía `layout` y `app.ts` en T13, es decir **primero**. Con `zone.js` (la app del navegador arranca por `main.ts`), un ancestro `OnPush` no se revisa si sus descendientes en `Default` cambian campos comunes por HTTP o temporizadores: `App` y `Layout` son ancestros de todas las pantallas y habrían roto, por ejemplo, `LoginForm.isLoading` y el perfil. Se cambió el diseño (D2: de las hojas hacia la raíz, un componente pasa a `OnPush` solo cuando todo su subárbol ya es seguro) y las tareas: T13 queda con las 4 hojas y `layout` y `app.ts` pasan a la nueva **T17b**, al final. No se escribió código antes de corregir la spec.
- **Inventario de estado mutable:** `app.ts` (solo el `signal` `title`), `layout` (sin estado), `confirm-dialog` (solo `data` inyectado, constante), `toast-container` (lee la señal `notifications` del servicio) y `header` (todo viene de stores como `signal`/`computed`; el `router-outlet` lo declara `Layout`, solo se proyecta en el `ng-content` de `Header`) → sin campos comunes mutables. **`image-field`**: `previewUrl` lo lee la plantilla y cambia en eventos y en `ngOnChanges`; pasó a `signal`. `selectedFile` se queda como campo común: solo lo usa la lógica interna (`ngOnChanges`), no la plantilla ni ningún padre.
- **Aplicado:** `changeDetection: ChangeDetectionStrategy.OnPush` en `header`, `toast-container`, `confirm-dialog` e `image-field`. `app.ts` y `layout` siguen en `Default` hasta T17b.
- **Tests nuevos (8), de caracterización** (pasaban con `Default` y siguen pasando con `OnPush`; son la red para las próximas tareas): `toast-container.spec.ts` (3, `REQ-2.2`): muestra un éxito con `alert-success`, una por cada tipo con su clase, y desaparece al vencer su tiempo. `image-field.component.spec.ts` (5, `REQ-2.2`): estado inicial, vista previa al elegir un archivo (`blob:` y `fileSelected`), imageUrl nuevo que descarta la vista previa, «Subiendo imagen…» en modo controls y mensaje de error. No se escribió test para `header`, `app`, `layout` ni `confirm-dialog` porque no tienen estado mutable propio.
- **Verificación:** lint código 0; build código 0 (**794,35 kB**, +0,08 kB; sigue bajo 800 kB, margen 5,65 kB); tests **107 en verde** (99 + 8).

### `OnPush` en `auth` (T14), 2026-10-16
- **Inventario de estado mutable:** `LoginForm`: `isLoading` (cambia en el `finally` de una operación asíncrona) y `showPassword` (lo cambia `togglePassword()`); `RegisterForm`: `isLoading`. Los dos formularios son hojas (no tienen componentes hijos propios, solo `RouterLink`), así que cumplen la regla de subárbol seguro. `returnUrl` y `authRequired` son constantes leídas una vez del snapshot de la ruta.
- **Cambios:** `isLoading` y `showPassword` pasaron a `signal` (`showPassword.update(...)`, `isLoading.set(...)`), las plantillas leen `isLoading()` y `showPassword()`, y los dos componentes declaran `ChangeDetectionStrategy.OnPush`.
- **Tests nuevos (8):** `login-form.spec.ts` (+4, `REQ-2.2`) y `register-form.spec.ts` (nuevo, +4: `should create` y 3 de `REQ-2.2`): botón deshabilitado con el formulario vacío; mientras se envía muestra «Ingresando…» / «Creando cuenta…» con el botón deshabilitado y al terminar vuelve al texto normal; si falla vuelve al texto normal, habilita el botón y conserva lo escrito; y, solo en `LoginForm`, alternar `showPassword` cambia el tipo del campo de contraseña. Se escribe como lo haría el usuario (evento `input` del DOM), no con `setValue`, que no marca sucio a un componente `OnPush`.
- **Rojo antes de implementar:** 3 de los 8 fallaban con `NG0100` (el login fallido y el registro fallido volviendo a habilitar el botón, y `showPassword`), justo los que cambian un campo común fuera de un evento. Con signals pasan.
- **Hallazgo sobre el entorno de pruebas:** todos los specs usan `provideZonelessChangeDetection`, y en modo zoneless un campo común cambiado fuera de un evento no se renderiza **ni siquiera con `Default`** (de ahí el rojo previo). La app del navegador corre con `zone.js`, así que en producción esos campos sí se veían; con `OnPush` + signals el comportamiento es el mismo en los dos modos. Los tests de esta spec son, por eso, una verificación más estricta que el navegador actual.
- **Verificación:** lint código 0; build código 0 (**794,42 kB**, margen 5,58 kB); tests **115 en verde** (107 + 8).

### `OnPush` en `cart`, `checkout`, `home` y `product-detail` (T15), 2026-10-16
- **Inventario de estado mutable:** los 5 componentes (`CartPage`, `CheckoutPage`, `CheckoutSuccessPage`, `HomePage`, `ProductDetailPage`) ya guardaban todo su estado en `signal`/`computed`. Los únicos campos comunes son `requestSeq` y `appliedSearch` de `HomePage`, privados y que la plantilla no lee. La plantilla también lee estado de las tiendas (`favoritesStore.isFavorite()`, `cartStore.items()`), y se comprobó que ambas lo guardan en señales, así que `OnPush` los ve. El estado de `checkoutForm` (errores de campo) cambia solo con eventos del propio formulario o dentro de `placeOrder()` (un evento de envío). Los cinco son hojas respecto de componentes propios (solo usan `RouterLink`), así que cumplen la regla de subárbol seguro. **No hubo que convertir ningún campo**: el cambio de código es solo `ChangeDetectionStrategy.OnPush`.
- **Tests nuevos (14, de caracterización):** `cart-page.spec.ts` (nuevo, 5): esqueleto mientras carga, estado vacío, ítems tras cargar, error con «Reintentar» que vuelve a pedir, y quitar un ítem (spinner y botón deshabilitado mientras espera, desaparece al terminar). `checkout-success-page.spec.ts` (nuevo, 3): «Cargando detalle…», pedido cargado (número y «Esperando transferencia») y error («No pudimos cargar este pedido.»). `checkout-page.spec.ts` (nuevo, 6): esqueleto, error de carga, formulario con «Finalizar pedido» deshabilitado hasta completarlo, «Procesando pedido…» al enviar, mensaje del backend al rechazar con el botón habilitado de nuevo, y recarga del carrito más navegación a `/checkout/success/12` al confirmarse. `home-page.spec.ts` y `product-detail-page.spec.ts` ya cubrían sus estados (T9 y la spec de `catalog-access`).
- **Dos tropiezos en los tests:** (1) un doble de `Router` rompió el `routerLink` de la plantilla; se usó el router real con `navigate` espiado. (2) El lint cazó una variable `navigate` sin usar; en vez de borrarla se agregó el test de navegación al confirmar el pedido, que faltaba.
- **Verificación:** lint código 0; build código 0 (**794,51 kB**, margen 5,49 kB); tests **129 en verde** (115 + 14).

### `OnPush` en el admin de productos (T16a), 2026-10-16
- **Árbol y orden** (hojas primero): `ProductWarnDialog` (hoja) → `PrdFormComponent` (contiene `ImageField`, ya `OnPush`) → `ProductFormDialog` (contiene `PrdForm`) → `PrdListComponent` (contiene `AdminToolbar` y `ProductMobileCard`, aún en `Default`) → `PrdAdminComponet` (página). Los diálogos se abren con CDK `Dialog` (overlay), no son hijos de la lista. `AdminToolbar` y `ProductMobileCard` solo dependen de `@Input` y de sus propios eventos, así que son seguros bajo un padre `OnPush`; pasan a `OnPush` en T16b.
- **Inventario y cambios:**
  - `ProductWarnDialog`: sin estado mutable (solo `data` inyectado) → solo `OnPush`.
  - `PrdFormComponent`: `categories`, `loadingCategories` (cambian en la respuesta HTTP), `isGeneratingContent`, `isAnalyzingImage` e `isAiSectionOpen` pasaron a `signal`; el getter `selectedCategoriesNames` y `canAnalyzeImageWithAi()` leen esas señales. **Estado del `FormGroup`** (valor, validez, touched): no es una señal y la IA lo cambia con `setValue` en callbacks asíncronos, así que `ngOnInit` se suscribe a `productForm.events` y llama a `markForCheck()` (con `takeUntilDestroyed`); es el puente estándar de formularios reactivos con `OnPush`. Los `@Input` (`isSaving`, `imageUrl`, `isUploadingImage`…) siguen siendo comunes: los actualiza el padre.
  - `ProductFormDialog`: `imageUrl`, `imageError`, `isUploadingImage`, `isDeletingImage` e `isSaving` pasaron a `signal` (son lo que le entrega al formulario hijo); `selectedImageFile` queda común porque la plantilla no lo lee.
  - `PrdListComponent`: `filteredProducts`, `categories`, `sortField` y `sortDirection` pasaron a `signal`; `products` queda común (solo lo lee `applyFilters`). La plantilla lee `filteredProducts()` (tarjetas y `dataSource` de la tabla CDK), `sortField()` y `sortDirection()`.
  - `PrdAdminComponet`: sin estado → solo `OnPush`.
- **Tests nuevos (17), todos `REQ-2.2`:** `product-list.component.spec.ts` (+4: estado vacío antes de que lleguen los productos, aparecen en tarjetas y tabla al llegar, el buscador filtra, el encabezado «Nombre» ordena con ▲/▼ y se invierte); `product-form.state.spec.ts` (nuevo, 8: «Cargando categorías», opciones al llegar, nombre mostrado cuando la IA elige categorías por código, botón Guardar que se habilita cuando el formulario pasa a válido por código, «Generando contenido…» y campos completados, falla de la generación, aria-expanded de la sección de IA, «Guardando…» con `isSaving`); `product-form-dialog.component.spec.ts` (nuevo, 5: «Guardando…» con Guardar y Cerrar deshabilitados, éxito que cierra con `updated`, falla 500, falla 403 «Límite de demo alcanzado», y el mensaje de error de imagen en create).
- **Rojo antes de implementar:** 12 de los 17 fallaban con `NG0100` bajo `Default` (los cambios de campos comunes fuera de un evento no se renderizan en zoneless): son los que cubren el cambio real de estado. Con las señales y el puente de eventos pasan los 17.
- **Hallazgo previo, fuera de alcance, no corregido:** la columna «Categorías» de la tabla llama a `getCategoryNames(row.categoryIds)`, pero `ProductResModel` no tiene `categoryIds` (tiene `categories`), por lo que muestra «-» siempre salvo que el backend envíe ese campo. Los tests no afirman nada sobre esa columna. Candidato a un arreglo aparte.
- **Verificación:** lint código 0; build código 0 (**794,54 kB**, margen 5,46 kB); tests **146 en verde** (129 + 17).

### `OnPush` en categorías, órdenes y `shared` del admin (T16b), 2026-10-16
- **Orden aplicado** (hojas primero): `AdminToolbar`, `CategoryMobileCard` y `ProductMobileCard` (compartidos; solo `@Input` y eventos propios) → `CategoryWarnDialog` → `CategoryFormComponent` → `CategoryFormDialog` → `CategoryListComponent` → `CategoryAdminComponent` (página) y, aparte, `OrderAdminPage`. Con esto, los 9 componentes de la tarea y los 5 de T16a (14 en total en `catalog-admin`) quedan en `OnPush`.
- **Inventario y cambios:** los tres compartidos y `CategoryWarnDialog`, `CategoryAdminComponent`: sin estado mutable → solo `OnPush`. `CategoryFormComponent`: solo `@Input` y eventos propios; sin cambios de estado asíncronos sobre su `FormGroup` (no hay IA aquí), por lo que no necesita el puente de `productForm.events` de T16a → solo `OnPush`. `CategoryFormDialog`: `imageUrl`, `imageError`, `isUploadingImage` e `isDeletingImage` pasaron a `signal` (son lo que le pasa al formulario hijo); `selectedImageFile` queda común. `CategoryListComponent`: `filteredCategories` pasó a `signal` (la plantilla lo lee en las tarjetas y en el `dataSource` de la tabla); `categories` queda común porque solo lo lee `applyFilters`. **`OrderAdminPage` ya guardaba todo en señales** (`orders`, `filteredOrders`, `selectedOrder`, `loading`, `detailLoading`, `statusLoading`) y su `spec` existente cubre el cambio de estado y el 409 → solo `OnPush`, sin tests nuevos.
- **Tests nuevos (12), todos `REQ-2.2`:** `category-list.component.spec.ts` (3: estado vacío antes de que lleguen, aparecen en tarjetas y tabla, y el buscador filtra); `category-form-dialog.component.spec.ts` (3: mensaje de imagen al subir antes de guardar, quitar la imagen elegida en alta, y en edición «Procesando…» mientras se borra la imagen y la imagen desaparece al terminar); `admin-toolbar.component.spec.ts` (3: texto del botón y placeholder que cambian por `@Input`, emite `create`, el texto llega al `FormControl`); `category-mobile-card.component.spec.ts` (3: nombre, slug calculado, cantidad y descripción; se actualiza si cambia la categoría; «Editar» y «Eliminar» emiten). `product-mobile-card` ya tenía spec.
- **Rojo antes de implementar:** 5 de los 12 fallaban bajo `Default` (los de `category-list` y `category-form-dialog`, que cambian campos comunes fuera de un evento); los 7 de `admin-toolbar` y `category-mobile-card` ya pasaban porque dependen solo de `@Input`, así que son de caracterización. Con las señales pasan los 12.
- **Una nota de método:** el primer intento de escribir los specs con varios `heredoc` en un solo comando fue rechazado por el shell; se escribieron con la herramienta de archivos. Un código 127 intermedio en una corrida de tests fue del entorno (no encontró el comando), no de los tests: repetida, dio 158 en verde.
- **Estado de REQ-2.1:** `grep -rL "changeDetection: ChangeDetectionStrategy.OnPush" …` sobre los `@Component` (sin specs) lista solo `app.ts`, `layout.ts` (T17b) y `profile.ts` (T17).
- **Verificación:** lint código 0; build código 0 (**794,54 kB**, margen 5,46 kB); tests **158 en verde** (146 + 12).

### `Profile` con signals y `OnPush` (T17), 2026-10-16
- **Cambios en `profile.ts`:** `selectedImageFile`, `imageError`, `isUploadingImage`, `isDeletingImage` y `enableEdit` pasaron a `signal`; `profile` es el `computed` del store (`store.userProfile`) y `avatar` un `computed` derivado de él. Un `effect()` en el constructor copia el perfil al `FormGroup` (`reset` + `disable`) solo si `enableEdit()` es `false`; sustituye al `ngAfterViewInit`. Subida y borrado ya no guardan el avatar en un campo propio: actualizan el perfil del store (`setAvatar`) y `avatar` se recalcula. La plantilla lee los signals con `()`.
- **Corrección de un fallo latente (REQ-3.10):** `onDeleteImage()` llamaba a `deleteProfileImage` sin capturar el rechazo, que terminaba como promesa no manejada; ahora lo captura y el mensaje de error queda en `imageError` («No se pudo eliminar la imagen de perfil.»), antes solo salía el toast. En la subida con imagen previa, si falla el borrado interno, el mensaje final sigue siendo el de subida (comportamiento previo).
- **Tests (13 en `profile.spec.ts`, antes 1):** un `it` por cada criterio REQ-3.1 a 3.11, más «subir una imagen mientras se edita no pisa lo que se está escribiendo» y el `should create`. Los estados `isUploadingImage`/`isDeletingImage` se comprueban en las entradas del `app-image-field` hijo; `avatar`, en el `<img>` y en el store.
- **Rojo antes de implementar:** 9 de los 13 fallaban bajo `Default`; con las señales pasan los 13.
- **Estado de REQ-2.1:** quedan sin `OnPush` solo `app.ts` y `layout.ts` (T17b).
- **Verificación:** lint código 0; build código 0 (**794,67 kB**, margen 5,33 kB); tests **170 en verde** (158 + 12).

### `OnPush` en `layout` y `app.ts` (T17b), 2026-10-16
- **Cambios:** `changeDetection: ChangeDetectionStrategy.OnPush` en `App` y `Layout`. Ninguno tiene estado que cambie (`App.title` ya era `signal` y no se muestra), así que no hubo otros ajustes. Se hicieron al final porque son ancestros de todas las pantallas; con el resto ya en `OnPush` no queda ningún hijo `Default` que dependa de ellos.
- **Tests:** `layout.spec.ts` nuevo (2, `REQ-2.2`): muestra `app-toast-container` y `app-header`, y al navegar a una ruta la pantalla aparece dentro del encabezado (`router-outlet`). Los de `app.spec.ts` siguen en verde.
- **Humo manual:** el recorrido en navegador (login, perfil, admin) queda para T20, que lo hace una persona.
- **Verificación:** lint código 0; build código 0 (**794,70 kB**, margen 5,30 kB); tests **172 en verde** (170 + 2).

### Verificación de `OnPush` y regla de ESLint (T18 y T19), 2026-10-16
- **T18:** el `grep -rL "changeDetection: ChangeDetectionStrategy.OnPush"` sobre los 33 archivos con `@Component` (sin specs) devolvió una lista vacía. REQ-2.1 cumplido.
- **T19:** se agregó `'@angular-eslint/prefer-on-push-component-change-detection': 'error'` a `eslint.config.js`. `npm run lint` queda en 0.
- **Prueba manual de la regla:** se quitó `changeDetection` de `app.ts`; `eslint` falló con «The component's `changeDetection` value should be set to `ChangeDetectionStrategy.OnPush`» (`@angular-eslint/prefer-on-push-component-change-detection`), además del import sin uso. Se restauró el archivo (`git status` solo muestra `eslint.config.js`) y el lint volvió a 0. REQ-2.4 y REQ-9.2 cubiertos.
- **Verificación:** lint código 0 antes y después de la prueba; el cambio es solo de configuración, sin tocar código de la app.

### Documentación (T21), 2026-10-16
- **`.claude/specs/pendientes.md`:** fila de la Fase 3 y nueva sección «Fase 3, spec 3: `frontend-cleanup`» (qué se hizo, qué falta: T20 y T22); el bundle de 882 kB pasa a resuelto (794,70 kB); los cuatro ítems de frontend de la lista de la Fase 3 quedan tachados salvo SSR. Abierto anotado: providers duplicados `main.ts`/`app.config.ts`, `LoginResponse.user.id` literal `1` sin `role`, columna «Categorías» con `row.categoryIds` inexistente, `loadingProfile` sin lector y la contingencia T11/T12.
- **`.claude/steering/structure.md`:** `core/data-access` en el árbol y como regla; `AuthStore` única fuente de sesión y único dueño del `localStorage` de sesión; `OnPush` + signals como convención. Se evitó afirmar que ninguna feature importa de otra: `profile` todavía importa `AuthService` de `auth`.
- **`.claude/steering/tech.md`:** ESLint 9 del frontend y la regla de `OnPush`. **`CLAUDE.md`:** `npm run lint` en «Comandos» y el lint del frontend entre lo que bloquea el CI.
- **Verificación:** `grep -rn "core/data-access" .claude/steering/structure.md` y `grep -n "npm run lint" CLAUDE.md` con coincidencias. Solo documentación: no se corrieron tests ni build.

### Auditoría con `code-auditor` (antes de T22), 2026-10-16
- **Veredicto:** aprobable, 0 bloqueantes y 5 menores. Se audita contra `origin/main`: el `main` local está desactualizado y esta rama sale de `refactor/backend-architecture` (aún sin mergear), así que un PR a `main` antes de esa rama arrastraría también el backend.
- **M2 (aplicado):** `@eslint/js` declarado en `devDependencies` (`^9.39.5`, la misma versión que ya resolvía); solo cambian `package.json` y el lock, sin mover otras versiones.
- **M4 (aplicado):** estado de la spec y decisiones de `requirements.md`/`design.md` pasados a «tomadas».
- **M1, M3 y M5 (no aplicados; anotados en `pendientes.md`):** sesión que queda guardada si falla `getUserById` tras un login correcto (`auth.facade.ts`); errores relanzados sin capturar en los diálogos de producto y categoría; `role` de `userLite` sin validar en `rehydrate()`. Los tres ya existían antes de la spec y cambiarlos exige ampliar el diseño.

### Cierre de criterios (T22)
*(pendiente)*

---
**Estado:** Aprobada el 2026-10-16. T0 a T19 y T21 ejecutadas; pendientes T20 (humo manual) y T22 (cierre).
