# Requisitos: frontend-cleanup

Tercera y última spec de la Fase 3 (arquitectura y calidad). Viene después de `quality-baseline` (tests, lint y CI en verde) y de `backend-architecture`. Es una limpieza del frontend **sin cambios de comportamiento visible**, salvo el manejo de sesión corrupta o incompleta (REQ-1.5 a REQ-1.7), que se define aquí.

## 1. Contexto y decisiones

**De dónde sale:** la auditoría del 2026-10-12 y `quality-baseline` dejaron anotados cuatro problemas del frontend.

**Estado medido el 2026-10-16 (rama `refactor/backend-architecture`, `a6e3d71`):**

| Tema | Hoy |
|---|---|
| Sesión | `localStorage` con las claves `token` y `userLite` se escribe y se lee en **tres** archivos: `core/state/auth.store.ts` (`setAuth`, `clear`, `rehydrate`), `features/auth/services/auth.service.ts:40` (`loginUser` guarda `token` en un `tap`) y `features/auth/services/auth.facade.ts:74-75` (`hydrate` lee ambas). `AuthStore.rehydrate()` **sí se usa**: lo llama `src/main.ts` como `APP_INITIALIZER`; después `main.ts` llama `AuthFacade.hydrate()`, que vuelve a leer las dos claves, las vuelve a fijar con `setAuth` y carga el perfil. El interceptor ya lee el token desde el store. *(Corregido el 2026-10-16: la primera versión decía que nadie lo llamaba porque el relevamiento no miró `src/main.ts`.)* |
| `OnPush` | 5 de 33 componentes lo declaran (28 sin `OnPush`). |
| `Profile` | `features/profile/profile.ts` guarda `profile`, `avatar`, `selectedImageFile`, `imageError`, `isUploadingImage`, `isDeletingImage` y `enableEdit` como campos comunes; lee `store.userProfile()` una sola vez al construirse. |
| Código muerto | `LoginForm.postItems()` → `AuthFacade.newPost()` → `AuthService.postItems()`, que hace `POST /posts` con un cuerpo de prueba (ese endpoint no existe en el backend). Además, `HomePage` declara `selector: 'app-header'`, el mismo que el componente `Header` real. |
| Dependencias entre carpetas | `features/home`, `features/product-detail` y `core/services/favorites.service.ts` importan modelos y servicios desde `features/catalog-admin/...` (`ProductService`, `CategoryService`, `CategoryResModel`, `ProductResModel`). |
| Bundle | El build de producción avisa: el bundle inicial supera el presupuesto `initial` de 800 kB (medido en 882 kB en `quality-baseline`; el error es a 1 MB). |

**Decisiones tomadas (con el usuario, 2026-10-16):**
- Alcance: los cuatro frentes (bundle, sesión única, `OnPush` + `Profile`, código muerto + `core/data-access`).
- **SSR queda fuera de alcance**: se decide en otra spec junto con el SEO de la Fase 4.

**Decisiones de diseño de la spec (a confirmar al aprobar; se pasan a "tomadas" con el sí):**
- `AuthStore` es la única fuente de verdad de la sesión; `AuthService` y `AuthFacade` no tocan `localStorage`.
- `AuthStore.rehydrate()` sigue siendo el único que lee `localStorage` (lo llama `main.ts` como `APP_INITIALIZER`); `AuthFacade.hydrate` deja de releerlo y toma la sesión del store.
- Una sesión guardada es **válida** si `token` es un string no vacío y `userLite` es un JSON que contiene un `id` numérico.
- **ESLint se agrega al frontend** (acordado con el usuario el 2026-10-16, como capa extra de calidad): solo `devDependencies`, configuración mínima y bloqueante en el CI. No se agrega ninguna otra dependencia (Renovate, librerías de estado, etc.) ni ninguna dependencia de producción.
- El presupuesto de 800 kB **no se sube**: se baja el bundle. Las técnicas concretas (lazy loading de rutas, cargar FontAwesome por ícono, etc.) se eligen en el diseño después de medir. **Plan B:** si bajar de 800 kB exige cambiar el alcance (quitar una pantalla o una librería), se para y se vuelve a esta spec antes de seguir.
- Los tests existentes siguen verdes; si un cambio rompe uno, se corrige en el mismo cambio.
- Las verificaciones por inspección (REQ-1.8, 4.x, 5.3, 7.3) se definen en las tareas con su método concreto (`grep`, test o `git diff`).

**Fuera de alcance:**
- SSR y SEO.
- Mover el token a cookie `httpOnly`, refresh token o cualquier cambio de seguridad de la sesión (Fase 4).
- Rediseñar pantallas o cambiar textos y estilos visibles.
- Migrar formularios a otra API (se mantienen Reactive Forms; Signal Forms requiere Angular 21).
- Cambios en el backend.
- Dependencias nuevas, salvo las `devDependencies` de ESLint (REQ-9).

## 2. Requisitos

### REQ-1: Una sola fuente de verdad para la sesión

- **REQ-1.1** CUANDO el login responde con éxito, EL SISTEMA DEBERÁ guardar `token` y `userLite` únicamente a través de `AuthStore.setAuth`.
- **REQ-1.2** CUANDO se ejecuta `AuthService.loginUser`, EL SISTEMA DEBERÁ no escribir en `localStorage`.
- **REQ-1.3** CUANDO la aplicación arranca con una sesión guardada válida, EL SISTEMA DEBERÁ restaurar `token` y `userLite` en `AuthStore` mediante `AuthStore.rehydrate()` (llamado desde el `APP_INITIALIZER` de `main.ts`), sin que `AuthFacade` lea `localStorage`.
- **REQ-1.4** CUANDO la sesión se restaura, EL SISTEMA DEBERÁ solicitar el perfil con `AuthService.getUserById` usando el `id` de `userLite` restaurado.
- **REQ-1.5** CUANDO `userLite` guardado no es un JSON válido, EL SISTEMA DEBERÁ arrancar sin sesión.
- **REQ-1.6** CUANDO solo existe una de las dos claves (`token` sin `userLite`, o al revés), EL SISTEMA DEBERÁ arrancar sin sesión.
- **REQ-1.7** CUANDO la sesión guardada es inválida (REQ-1.5 o REQ-1.6), EL SISTEMA DEBERÁ borrar ambas claves de `localStorage`.
- **REQ-1.8** CUANDO el usuario cierra sesión, EL SISTEMA DEBERÁ borrar `token` y `userLite` de `localStorage`.
- **REQ-1.9** CUANDO el usuario cierra sesión, EL SISTEMA DEBERÁ vaciar `token`, `userLite` y el perfil del `AuthStore`.
- **REQ-1.10** CUANDO el login falla (credenciales inválidas o error de red), EL SISTEMA DEBERÁ no escribir `token` ni `userLite` en `localStorage` ni en `AuthStore`.
- **REQ-1.11** CUANDO se buscan en el código de la aplicación (sin specs) las claves `'token'` y `'userLite'` de `localStorage`, EL SISTEMA DEBERÁ mostrar coincidencias solo en `core/state/auth.store.ts`.

### REQ-2: `OnPush` en todos los componentes

- **REQ-2.1** CUANDO se revisa cada componente de `frontend/src/app` (sin specs), EL SISTEMA DEBERÁ declarar `changeDetection: ChangeDetectionStrategy.OnPush`.
- **REQ-2.2** CUANDO cambia un `signal` o un `input()` que usa la plantilla de un componente `OnPush`, EL SISTEMA DEBERÁ mostrar el valor nuevo en la plantilla, comprobado por un test que cambie el valor y llame a `detectChanges`.
- **REQ-2.3** CUANDO un componente `OnPush` tiene estado mutable que usa la plantilla (campos que cambian por eventos, respuestas HTTP o temporizadores), EL SISTEMA DEBERÁ guardarlo en `signal` o `computed`.
- **REQ-2.4** CUANDO existe un componente sin `OnPush` y se ejecuta `npm run lint` en `frontend/`, EL SISTEMA DEBERÁ terminar con código distinto de 0. *(Reabierto el 2026-10-16 al aprobarse ESLint; ver REQ-9.)*

### REQ-3: `Profile` con signals

- **REQ-3.1** CUANDO el perfil del `AuthStore` cambia, EL SISTEMA DEBERÁ mostrar en `Profile` los datos nuevos sin recargar la página.
- **REQ-3.2** CUANDO el usuario presiona editar, EL SISTEMA DEBERÁ habilitar el formulario del perfil.
- **REQ-3.3** CUANDO el usuario presiona editar, EL SISTEMA DEBERÁ fijar `enableEdit` en `true` mediante un signal.
- **REQ-3.4** CUANDO el perfil todavía no está cargado, EL SISTEMA DEBERÁ mostrar el formulario vacío y deshabilitado, sin lanzar errores.
- **REQ-3.5** CUANDO comienza la subida de una imagen, EL SISTEMA DEBERÁ fijar `isUploadingImage` en `true`.
- **REQ-3.6** CUANDO la subida termina con éxito, EL SISTEMA DEBERÁ fijar `isUploadingImage` en `false` y mostrar la nueva imagen en `avatar`.
- **REQ-3.7** CUANDO la subida falla, EL SISTEMA DEBERÁ fijar `isUploadingImage` en `false` y dejar el mensaje de error en `imageError`.
- **REQ-3.8** CUANDO comienza el borrado de la imagen, EL SISTEMA DEBERÁ fijar `isDeletingImage` en `true`.
- **REQ-3.9** CUANDO el borrado termina con éxito, EL SISTEMA DEBERÁ fijar `isDeletingImage` en `false` y quitar la imagen de `avatar`.
- **REQ-3.10** CUANDO el borrado falla, EL SISTEMA DEBERÁ fijar `isDeletingImage` en `false` y dejar el mensaje de error en `imageError`.
- **REQ-3.11** CUANDO el usuario elige un archivo nuevo, EL SISTEMA DEBERÁ limpiar `imageError`.

### REQ-4: Código muerto

- **REQ-4.1** CUANDO se compila la aplicación, EL SISTEMA DEBERÁ no contener `LoginForm.postItems`, `AuthFacade.newPost` ni `AuthService.postItems`.
- **REQ-4.2** CUANDO se busca `/posts` en el código de la aplicación (sin specs), EL SISTEMA DEBERÁ mostrar cero coincidencias.
- **REQ-4.3** CUANDO se comparan los selectores de `HomePage` y `Header`, EL SISTEMA DEBERÁ mostrar que son distintos.
- **REQ-4.4** CUANDO se busca `AuthStore.rehydrate`, EL SISTEMA DEBERÁ mostrar que conserva su llamador de producción en `src/main.ts` (REQ-1.3).

### REQ-5: Servicios de lectura pública en `core/data-access`

- **REQ-5.1** CUANDO `features/home` o `features/product-detail` necesitan leer productos o categorías, EL SISTEMA DEBERÁ importarlos desde `core/data-access`, no desde `features/catalog-admin`.
- **REQ-5.2** CUANDO `core/services/favorites.service.ts` necesita el modelo `ProductResModel`, EL SISTEMA DEBERÁ importarlo desde `core/`, no desde `features/`.
- **REQ-5.3** CUANDO se buscan imports que contengan `catalog-admin` en `features/home`, `features/product-detail` y `core/`, EL SISTEMA DEBERÁ mostrar cero coincidencias.
- **REQ-5.4** CUANDO el panel de administración usa los servicios movidos, EL SISTEMA DEBERÁ hacer las mismas llamadas HTTP (mismas rutas, métodos y cuerpos), comprobado por los specs de los servicios.
- **REQ-5.5** CUANDO `home` y el detalle de producto cargan datos, EL SISTEMA DEBERÁ conservar sus estados de carga, vacío y error.
- **REQ-5.6** CUANDO un usuario cuyo rol no figura en `data.roles` de una ruta del panel de administración navega a ella, EL SISTEMA DEBERÁ redirigirlo a `/home`, comprobado por un test del guard. Los roles actuales, que se conservan: `admin/product` y `admin/category` admiten `ADMIN` y `GUEST`; `admin/orders` admite solo `ADMIN`. *(Enmendado el 2026-10-16: la primera versión decía «sin rol `ADMIN`», pero `GUEST` ya entra a product y category.)*

### REQ-6: Bundle inicial bajo el presupuesto

- **REQ-6.1** CUANDO se ejecuta `npm run build -- --configuration production` en `frontend/`, EL SISTEMA DEBERÁ reportar un bundle inicial de 800 kB o menos y no mostrar la advertencia de presupuesto `initial`.
- **REQ-6.2** CUANDO se carga la ruta `/home` en el navegador, EL SISTEMA DEBERÁ renderizar la lista de productos del catálogo sin errores en la consola.
- **REQ-6.3** CUANDO se carga cada ruta de administración (`products`, `categories`, `orders`), EL SISTEMA DEBERÁ renderizar su pantalla sin errores en la consola.
- **REQ-6.4** CUANDO se compara `angular.json` con `origin/main`, EL SISTEMA DEBERÁ no mostrar cambios en `maximumWarning` ni en `maximumError`.

### REQ-7: No regresión

- **REQ-7.1** CUANDO se ejecuta `npx ng test --no-watch --browsers=ChromeHeadless`, EL SISTEMA DEBERÁ pasar todos los tests existentes y los nuevos, sin tests desactivados.
- **REQ-7.2** CUANDO se ejecuta `npm run build` en `frontend/`, EL SISTEMA DEBERÁ terminar con código 0.
- **REQ-7.3** CUANDO se compara `package.json` del frontend con `origin/main`, EL SISTEMA DEBERÁ no mostrar diferencias en `dependencies`; las únicas diferencias admitidas son las `devDependencies` de ESLint (REQ-9) y el script `lint`.
- **REQ-7.4** CUANDO una persona recorre el humo manual en el navegador, EL SISTEMA DEBERÁ dar estos resultados: login con credenciales válidas deja la sesión abierta y recargar la página la mantiene; el home lista productos y filtra por búsqueda y categoría; el detalle muestra el producto; el carrito suma y quita ítems; el favorito se marca y persiste; el perfil muestra los datos y permite subir y borrar la imagen; el panel admin lista, crea y edita un producto.

### REQ-8: Documentación

- **REQ-8.1** CUANDO se cierre la spec, EL SISTEMA DEBERÁ dejar en `.claude/specs/pendientes.md` el estado de la Fase 3 actualizado y lo que quedó abierto del frontend.
- **REQ-8.2** CUANDO se cierre la spec, EL SISTEMA DEBERÁ reflejar en `.claude/steering/structure.md` la carpeta `core/data-access`.
- **REQ-8.3** CUANDO se cierre la spec, EL SISTEMA DEBERÁ reflejar en `.claude/steering/structure.md` que `AuthStore` es la única fuente de la sesión.
- **REQ-8.4** CUANDO se cierre la spec, EL SISTEMA DEBERÁ reflejar en `.claude/steering/tech.md` y en la sección «Comandos» de `CLAUDE.md` que el frontend tiene ESLint y su comando `npm run lint`.

### REQ-9: ESLint en el frontend

- **REQ-9.1** CUANDO se ejecuta `npm run lint` en `frontend/`, EL SISTEMA DEBERÁ analizar los `.ts` y `.html` de `src/` y terminar con código 0.
- **REQ-9.2** CUANDO se revisa la configuración de ESLint, EL SISTEMA DEBERÁ incluir las reglas recomendadas de `typescript-eslint` y de `angular-eslint` (TypeScript y plantillas) y la regla `@angular-eslint/prefer-on-push-component-change-detection`.
- **REQ-9.3** CUANDO el lint reporta un error en el código existente, EL SISTEMA DEBERÁ corregirse el código; ninguna regla se desactiva en la configuración para hacer pasar el lint.
- **REQ-9.4** CUANDO una línea necesita una excepción puntual, EL SISTEMA DEBERÁ llevar un `eslint-disable-next-line` con el motivo en el mismo comentario, y la spec lista cuántas hay al cerrar.
- **REQ-9.5** CUANDO el CI corre el job del frontend, EL SISTEMA DEBERÁ ejecutar `npm run lint` antes de los tests y fallar el job si el lint falla.
- **REQ-9.6** CUANDO se compara `package.json` con `origin/main`, EL SISTEMA DEBERÁ mostrar ESLint solo en `devDependencies`, de modo que `npm audit --omit=dev` no cambie su resultado.

## 3. Preguntas abiertas

- Ninguna bloqueante. La técnica para bajar el bundle (REQ-6) se decide en el diseño, con una medición previa de qué ocupa el bundle inicial; el plan B está en la sección 1.

## 4. Revisión (`spec-reviewer`, 2026-10-16)

Primera pasada: 4 bloqueantes y 6 menores, todos corregidos en esta versión.

| Hallazgo | Qué se hizo |
|---|---|
| B1 criterios "como antes" / "como hoy" | REQ-1.3 y 1.4 con resultados concretos; REQ-6.2 y 6.3 con ruta y "sin errores en la consola"; REQ-7.4 con el resultado esperado de cada paso del humo |
| B2 REQ-2.2 y 2.3 | REQ-2.2 exige un test con `detectChanges`; REQ-2.3 pasa a una regla sobre el estado mutable |
| B3 sesión incompleta | Agregados REQ-1.5 a 1.7 (JSON corrupto, clave faltante, limpieza) y REQ-1.10 (login fallido); definición de sesión válida en las decisiones |
| B4 `Profile` | REQ-3 partido en un criterio por estado y por evento, con las fallas de subida y borrado |
| M1 | REQ-4.3 solo pide selectores distintos; REQ-4.4 decidido: `rehydrate` se usa |
| M2 | REQ-6.1 separado del exit 0 (REQ-7.2); REQ-6.2 pasó a REQ-6.4 como comparación de `angular.json` |
| M3 | REQ-2.1 dice "todos los componentes"; el 33 queda solo en el contexto |
| M4 | Decisión: el método de verificación de cada inspección se fija en las tareas; REQ-2.4 (lint) queda como opcional |
| M5 | Decisiones de diseño con la nota "se pasan a tomadas con el sí"; plan B para REQ-6 |
| M6 | REQ-5.5 (estados loading/empty/error) y REQ-5.6 (guard del panel admin) |

**Enmienda 2026-10-16 (durante el diseño, tras la aprobación de los requisitos):** el relevamiento había omitido `src/main.ts`. `AuthStore.rehydrate()` sí tiene llamador (el `APP_INITIALIZER`), y `AuthFacade.hydrate()` duplica la lectura de `localStorage`. Cambios: contexto (fila «Sesión»), decisión de diseño sobre `hydrate`, REQ-1.3 y REQ-4.4. Los criterios no cambian de intención; REQ-1.11 ya cubría el duplicado.

**Enmienda 2026-10-16 (segunda, tras la revisión del diseño):** REQ-5.6 decía «sin rol `ADMIN`», pero `app.routes.ts` permite `GUEST` en `admin/product` y `admin/category`. Se reescribe con «rol que no figura en `data.roles`» y se fijan los roles por ruta. REQ-2.4 queda descartado (no hay ESLint). **Cambio de alcance al aprobar el diseño (2026-10-16):** el usuario pidió agregar ESLint «como una capa más» y ejecutar el linter en las tareas. REQ-2.4 se reabre, se agrega REQ-9 y REQ-8.4, y REQ-7.3 admite las `devDependencies` de ESLint. Además, el diseño agrega un cambio de comportamiento que no está en los criterios: `hydrate` captura el error de `getUserById` y devuelve `loadingProfile` a `false` (hoy queda en `true` si el perfil falla); se prueba bajo REQ-1.4.
