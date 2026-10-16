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

- [ ] **T3. Lint bloqueante en el CI** — REQ-9.5
  - En `.github/workflows/ci.yml`, job `frontend`: agregar `- run: npm run lint` después de `npm ci` y antes de `npx ng test`, con un comentario que apunte a esta spec. Sin `continue-on-error`.
  - Depende de: T2
  - Verificación: `grep -n "npm run lint" .github/workflows/ci.yml` muestra la línea dentro del job `frontend`, antes de `ng test`; el YAML sigue siendo válido (lectura del archivo). El resultado real en Actions lo confirma una persona al abrir el PR.

## Grupo C: sesión única (REQ-1)

- [ ] **T4. `AuthStore.rehydrate` validado y su spec** — REQ-1.1, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9
  - En `core/state/auth.store.ts`: `rehydrate()` valida (token string no vacío, `userLite` JSON con `id` numérico), usa `try/catch` alrededor de `JSON.parse` y, si la sesión es inválida, borra ambas claves y deja el store vacío sin lanzar. Crear `core/state/auth.store.spec.ts`.
  - Depende de: T2
  - Verificación: tests `REQ-1.1` (setAuth guarda), `REQ-1.8`/`REQ-1.9` (clear borra claves y vacía token, usuario y perfil), `REQ-1.3` (sesión válida), `REQ-1.5` (JSON roto), `REQ-1.6` (una sola clave, en las dos variantes) y `REQ-1.7` (las claves quedan borradas); `npm run lint` en 0; build ok.

- [ ] **T5. `AuthService.loginUser` sin `localStorage`** — REQ-1.1, 1.2, 1.10
  - Quitar el `tap` que escribe `token`. Crear `features/auth/services/auth.service.spec.ts` y ampliar `auth.facade.spec.ts`.
  - Depende de: T4
  - Verificación: tests `REQ-1.1` en `auth.facade.spec.ts` (un login exitoso llama a `AuthStore.setAuth` con el token y el usuario de la respuesta, y es la única escritura de sesión), `REQ-1.2` (tras un login exitoso del servicio `localStorage` no tiene `token`), `REQ-1.10` (login con 401 y con error de red: ni `localStorage` ni `AuthStore` quedan con sesión); `npm run lint` en 0; tests y build ok.

- [ ] **T6. `AuthFacade.hydrate` sin releer `localStorage`, con manejo de error** — REQ-1.3, 1.4, 1.11
  - `hydrate()` toma `store.userLite()`; si hay sesión pide `getUserById(userLite.id)` dentro de `try/catch/finally` (en la falla la sesión sigue y `loadingProfile` vuelve a `false`). `main.ts` no cambia.
  - Depende de: T5
  - Verificación: tests `REQ-1.4` en `auth.facade.spec.ts` (con sesión pide el perfil con el `id` correcto; sin sesión no pide nada; si falla, `loadingProfile` es `false` y la sesión sigue); `grep -rn "'token'\|'userLite'" src/app --include=*.ts` sin specs: solo `core/state/auth.store.ts` (REQ-1.11); `npm run lint` en 0; tests y build ok.

## Grupo D: código muerto (REQ-4)

- [ ] **T7. Borrar la cadena `postItems` y renombrar el selector de `HomePage`** — REQ-4.1, 4.2, 4.3, 4.4
  - Borrar `LoginForm.postItems`, `AuthFacade.newPost` y `AuthService.postItems`, y los imports que queden sin uso. Cambiar `selector` de `HomePage` a `app-home-page`. No tocar `AuthStore.rehydrate` ni `main.ts`.
  - Depende de: T2 (independiente de T4–T6)
  - Verificación: `grep -rn "postItems\|newPost\|/posts" src/app` (sin specs) vacío; `grep -rn "selector: 'app-header'" src/app` solo en `shared/header/header.ts`; `grep -n "rehydrate" src/main.ts` una coincidencia; `npm run lint` en 0; tests y build ok.

## Grupo E: `core/data-access` (REQ-5)

- [ ] **T8. Mover servicios y modelos de lectura pública a `core/data-access`** — REQ-5.1, 5.2, 5.3, 5.4
  - Con `git mv`: `product.service.ts` (+ `.spec.ts`), `prd-res.model.ts` y `product.model.ts` → `core/data-access/products/`; `category.service.ts` y `category.model.ts` → `core/data-access/categories/`. Actualizar los imports en `home`, `product-detail`, `core/services/favorites.service.ts` y en todo `catalog-admin`. Crear `category.service.spec.ts` (mismas rutas, métodos y cuerpos que hoy). No cambiar el contenido de los servicios.
  - Depende de: T2
  - Verificación: `grep -rn "catalog-admin" src/app/features/home src/app/features/product-detail src/app/core` vacío (REQ-5.3); `product.service.spec.ts` movido y en verde y `category.service.spec.ts` con un `it('REQ-5.4: ...')` por método HTTP; `npm run lint` en 0; tests y build ok.

- [ ] **T9. Pruebas de estados de `home`/detalle y de los roles del admin** — REQ-5.5, 5.6
  - `home-page.spec.ts`: estados loading, vacío y error. Un spec para `product-detail-page` si hoy no cubre esos tres estados. `auth-guard.spec.ts`: `ADMIN` y `GUEST` pasan en las rutas de `admin/product` y `admin/category`; `CLIENT` rebota a `/home`; `admin/orders` solo deja pasar a `ADMIN`; sin sesión va a `/login`.
  - Depende de: T8
  - Verificación: los tests nombrados con `REQ-5.5` y `REQ-5.6` en verde; `npm run lint` en 0; build ok.

## Grupo F: bundle bajo el presupuesto (REQ-6)

Cada paso termina midiendo el build y anotando el total inicial. **Se para en cuanto el total es de 800 kB o menos** (los pasos siguientes no se hacen). Si tras T12 sigue sobre 800 kB, se para y se vuelve a la spec (plan B).

- [ ] **T10. Rutas de administración perezosas, con un spec de la configuración real de rutas** — REQ-6.1, 6.3, 5.6
  - **Primero** crear `app.routes.spec.ts`, que lee el arreglo real `routes` y comprueba `canActivate` (con `authGuard`) y `data.roles` de `admin/product` (`ADMIN`, `GUEST`), `admin/category` (`ADMIN`, `GUEST`), `admin/orders` (`ADMIN`) y que `checkout`, `checkout/success` y `profile` tienen `authGuard`. El spec debe pasar **antes** del cambio. Después, en `app.routes.ts`, `admin/product`, `admin/category` y `admin/orders` pasan a `loadComponent: () => import(...)`, conservando `canActivate`, `data.roles` y `pathMatch`.
  - Depende de: T8, T9
  - Verificación: `app.routes.spec.ts` en verde antes y después del cambio (`it('REQ-5.6: ...')` por ruta); `auth-guard.spec.ts` en verde; build: total inicial anotado (esperado ≈ 65 kB menos); `npm run lint` en 0; tests ok.

- [ ] **T11. Páginas de autenticación perezosas** — REQ-6.1, 6.3
  - `check-email`, `forgot-password`/`request-password-reset`, `reset-password` y `verify-email` con `loadComponent`. `login` y `register` quedan eager.
  - Depende de: T10
  - Verificación: build: total inicial anotado (acumulado esperado ≈ 81 kB menos); `app.routes.spec.ts` sigue en verde; `npm run lint` en 0; tests ok.

- [ ] **T12. `cart`, `checkout`, `checkout/success` y `profile` perezosos** — REQ-6.1, 6.3
  - Mismo cambio, conservando `canActivate` en las rutas que lo tienen (`checkout`, `checkout/success`, `profile`).
  - Depende de: T11
  - Verificación: build: total inicial ≤ 800 kB y sin la advertencia de presupuesto (REQ-6.1); `app.routes.spec.ts` sigue en verde (guards de `checkout` y `profile` intactos); `git diff origin/main -- angular.json` sin cambios en `budgets` (REQ-6.4); `npm run lint` en 0; tests ok.

## Grupo G: `OnPush` y `Profile` (REQ-2, 3)

Para cada componente de un grupo: (1) inventariar los campos que cambian por eventos, HTTP o temporizadores y que usa la plantilla, y pasarlos a `signal`/`computed`; (2) agregar `changeDetection: ChangeDetectionStrategy.OnPush`; (3) agregar un test con `detectChanges` para cada componente con estado mutable.

- [ ] **T13. `OnPush` en `shared/` y `core/layouts`** — REQ-2.1, 2.2, 2.3
  - `header`, `toast-container`, `confirm-dialog`, `image-field`, `layout` y `app.ts`.
  - Depende de: T2
  - Verificación: tests `REQ-2.2` para los que tienen estado mutable; `npm run lint` en 0; tests y build ok.

- [ ] **T14. `OnPush` en `auth`** — REQ-2.1, 2.2, 2.3
  - `login-form` (incluye `isLoading`, que hoy es un campo común) y `register-form`.
  - Depende de: T7, T13
  - Verificación: tests `REQ-2.2` en `login-form.spec.ts` y `register-form`; `npm run lint` en 0; tests y build ok.

- [ ] **T15. `OnPush` en `cart`, `checkout`, `home` y `product-detail`** — REQ-2.1, 2.2, 2.3
  - `cart-page`, `checkout-page`, `checkout-success-page`, `home-page`, `product-detail-page`.
  - Depende de: T9, T12, T13
  - Verificación: tests `REQ-2.2` en los specs de esos componentes (`home-page.spec.ts` ya existe); `npm run lint` en 0; tests y build ok.

- [ ] **T16a. `OnPush` en el admin de productos** — REQ-2.1, 2.2, 2.3
  - Los 5 componentes de `catalog-admin/products`: `product-admin.page`, `product-form`, `product-form-dialog`, `product-list`, `product-warn-dialog`. En el inventario previo, anotar cuáles tienen estado mutable.
  - Depende de: T12, T13
  - Verificación: un test `REQ-2.2` por cada componente del inventario con estado mutable (en los specs existentes `product-form`, `product-list` o nuevos); `npm run lint` en 0; tests y build ok.

- [ ] **T16b. `OnPush` en el admin de categorías, órdenes y `shared`** — REQ-2.1, 2.2, 2.3
  - Los 9 componentes restantes de `catalog-admin`: `category-admin.page`, `category-form`, `category-form-dialog`, `category-list`, `category-warn-dialog`, `order-admin.page`, `admin-toolbar`, `category-mobile-card`, `product-mobile-card`. Inventario previo de estado mutable.
  - Depende de: T12, T13
  - Verificación: un test `REQ-2.2` por cada componente del inventario con estado mutable (`order-admin.page.spec.ts` y `product-mobile-card` ya existen); `npm run lint` en 0; tests y build ok.

- [ ] **T17. `Profile` con signals y `OnPush`** — REQ-3.1 a 3.11, 2.1
  - Según el diseño D3: `selectedImageFile`, `imageError`, `isUploadingImage`, `isDeletingImage` y `enableEdit` como `signal`; `profile` y `avatar` como `computed`; `effect()` que copia el perfil al formulario solo si `enableEdit()` es `false`.
  - Depende de: T13
  - Verificación: en `profile.spec.ts`, un `it` por criterio (`REQ-3.1` a `REQ-3.11`), incluido «subir imagen durante la edición no pisa los campos del formulario»; `npm run lint` en 0; tests y build ok.

- [ ] **T18. Verificar `OnPush` en todos los componentes** — REQ-2.1
  - Comprobar que ningún componente quedó sin `OnPush`.
  - Depende de: T14, T15, T16a, T16b, T17
  - Verificación (con Bash, sintaxis POSIX): `grep -rL "changeDetection: ChangeDetectionStrategy.OnPush" $(grep -rl "@Component" src/app --include=*.ts | grep -v spec)` vacío; el patrón completo evita que un import sin uso cuente como `OnPush`.

- [ ] **T19. Activar la regla de `OnPush` en ESLint** — REQ-2.4, 9.2
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
  - Depende de: T12, T18
  - Verificación: cada paso del humo anotado con su resultado en el registro.

- [ ] **T21. Documentación** — REQ-8.1, 8.2, 8.3, 8.4
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
              ├→ T8 → T9 → T10 → T11 → T12         │
              └→ T13 ─┬→ T14 (necesita T7)         │
                      ├→ T15 (necesita T9, T12)    │
                      ├→ T16a (necesita T12)       │
                      ├→ T16b (necesita T12)       │
                      └→ T17                       │
T14, T15, T16a, T16b, T17 → T18 → T19 → T21 ───────┤
T12, T18 → T20 ────────────────────────────────────┴→ T22
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

### Cierre de criterios (T22)
*(pendiente)*

---
**Estado:** Pendiente de aprobación
