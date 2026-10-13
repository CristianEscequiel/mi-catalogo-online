# Requisitos: quality-baseline

Primera de tres specs de la Fase 3 (arquitectura y calidad). Las otras dos, `backend-architecture` y `frontend-cleanup`, se apoyan en esta.

## 1. Contexto y decisiones

**De dónde sale:** la auditoría del 2026-10-12 detectó que los tests y el lint no protegen nada: el CI los corre con `continue-on-error`, así que un cambio que los rompa se mergea igual. Las specs de la Fase 2 agregaron muchas pruebas nuevas, pero si alguien las rompe hoy el CI sigue en verde.

**Estado medido el 2026-10-13 (con `main` en `2bd8993`):**

| Área | Estado | Causa |
|---|---|---|
| Backend, jest unitario | 6 suites fallan (5 tests) de 33; 270 tests pasan | Los 6 son specs de scaffold `should be defined` que no proveen las dependencias del módulo (`ConfigService`, `UsersService`, `UserRepository`, etc.). `auth.controller.spec.ts` además importa `./controllers/auth.controller` desde la propia carpeta `controllers/`. |
| Backend, ESLint | 172 errores y 3 avisos | 149 son `prettier/prettier`, de los cuales ~147 están en migraciones ya aplicadas. Los ~23 restantes son reales: `no-unsafe-*` por `req.user` sin tipar (`favorites`, `orders`, `cart`, `roles.guard`), `multer-image-options.factory.ts`, `openai.service.ts`, specs, y `no-unused-vars` en `category.service.ts` y `product.service.ts`. |
| Frontend, Karma | 5 de 38 tests fallan | `App` ×2, `AuthFacade`, `LoginForm`, `Profile`: falta `provideHttpClient` y configuración de Zone.js en el `TestBed`. |
| `npm audit --omit=dev` | Backend: 24 (1 crítica, 12 altas). Frontend: 15 (2 críticas, 11 altas) | Dependencias directas de Nest y Angular desactualizadas dentro de su misma versión mayor, más transitivas (`proxy-addr`, `path-to-regexp`, `multer`, `lodash`, `validator`, `postcss`, etc.). El propio `npm audit` informa que los arreglos de las altas y críticas no requieren salto de versión mayor (`isSemVerMajor: false`, `fixAvailable: true`). |

**Decisiones tomadas (con el usuario, 2026-10-13):**
- Arrancar por esta spec, y que incluya las vulnerabilidades de `npm audit`.
- Las vulnerabilidades se arreglan con actualizaciones compatibles dentro de la misma versión mayor. Un salto de versión mayor queda fuera de alcance y se anota.

**Decisiones de diseño de la spec (a confirmar al aprobar):**
- Las migraciones ya aplicadas se **excluyen del lint** en lugar de reformatearlas: son históricas, generadas y reformatear su texto no aporta nada.
- Los errores `no-unsafe-*` de `req.user` se arreglan **tipando el request** (una interfaz mínima). El decorador `@CurrentUser()` queda para `backend-architecture`.
- Los tests de scaffold que solo dicen `should be defined` se **reemplazan por pruebas con valor** cuando el servicio tiene lógica propia que probar; si no hay nada útil que probar, se borran con confirmación (regla de `AGENTS.md`).
- El CI pasa a ser bloqueante en lint, tests unitarios backend, tests frontend y `npm audit` a nivel **crítico**. Las altas se arreglan ahora pero no bloquean, para que un aviso nuevo de un tercero no deje el CI en rojo de un día para el otro.

**Fuera de alcance:**
- Saltos de versión mayor de dependencias (NestJS 12, Angular 21, etc.).
- Arquitectura: `@CurrentUser()`, DTOs de respuesta, puertos y repositorios (`backend-architecture`).
- Frontend: `OnPush` general, `AuthStore` único, SSR, tamaño del bundle (`frontend-cleanup`).
- Correr las suites e2e (`backend/test/*.e2e-spec.ts`, necesitan Postgres) en el CI. Se anota como candidato a spec propia, ver "Pregunta abierta".
- Subir la cobertura: no se fija un umbral.
- Vulnerabilidades de seguridad funcionales del informe (SSRF en IA, JWT, enumeración en `register`, magic bytes).

**Pregunta abierta:** ¿querés que el CI también corra las 11 suites e2e con un contenedor de Postgres? Hoy son la protección más fuerte de la integridad de órdenes y de acceso, pero nunca corren en Actions. Es trabajo extra de CI (servicio `postgres`, variables `TEST_DB_*`, `--runInBand`). Propuesta: dejarlo fuera de esta spec y abrir una chica después.

## 2. Requisitos

### REQ-1: Tests unitarios del backend en verde

- **REQ-1.1** CUANDO se ejecute `npm test` en `backend/`, EL SISTEMA DEBERÁ terminar con código de salida 0 y 0 suites fallidas.
- **REQ-1.2** CUANDO una suite de scaffold `should be defined` pertenezca a un servicio o controlador con lógica propia (`AuthService`, `AuthController`, `UsersService`, `UsersController`, `MailService`, `OpenaiService`), EL SISTEMA DEBERÁ tener, en lugar del test vacío, al menos una prueba de un comportamiento real de esa clase (camino feliz o un error esperado), con sus dependencias reemplazadas por dobles de prueba.
- **REQ-1.3** CUANDO `auth.controller.spec.ts` se ejecute, EL SISTEMA DEBERÁ resolver el import del controlador desde la ruta correcta.
- **REQ-1.4** CUANDO se agreguen o reescriban specs, EL SISTEMA DEBERÁ no depender de red, de base de datos ni de variables de entorno reales.
- **REQ-1.5** CUANDO una suite de scaffold no tenga ningún comportamiento propio que probar, EL SISTEMA DEBERÁ proponerse su eliminación al usuario y no borrarla hasta recibir confirmación explícita.

### REQ-2: Tests del frontend en verde

- **REQ-2.1** CUANDO se ejecute `npx ng test --no-watch --browsers=ChromeHeadless` en `frontend/`, EL SISTEMA DEBERÁ terminar con código de salida 0 y 0 tests fallidos.
- **REQ-2.2** CUANDO un spec instancie un componente o servicio que inyecte `HttpClient`, EL SISTEMA DEBERÁ proveerlo con `provideHttpClient()` y `provideHttpClientTesting()` en el `TestBed`, de modo que ningún test salga a la red.
- **REQ-2.3** CUANDO un spec requiera el scheduler de Angular, EL SISTEMA DEBERÁ configurarlo (zoneless o con Zone.js, según lo que use la app) de forma que no aparezca el error `NG0908`.
- **REQ-2.4** CUANDO un test falle por una causa distinta de la configuración del `TestBed` (por ejemplo, el componente se comporta distinto de lo que el test espera), EL SISTEMA DEBERÁ corregir la expectativa solo si el componente es el correcto, y avisar al usuario antes de cambiar código de producción.

### REQ-3: Lint del backend limpio

- **REQ-3.1** CUANDO se ejecute `npx eslint "{src,apps,libs,test}/**/*.ts"` en `backend/`, EL SISTEMA DEBERÁ terminar con código de salida 0 (0 errores; los avisos se admiten).
- **REQ-3.2** CUANDO el lint recorra el repositorio, EL SISTEMA DEBERÁ excluir `src/database/migrations/**` y no modificar ningún archivo de migración.
- **REQ-3.3** CUANDO un controlador lea `req.user`, EL SISTEMA DEBERÁ usar un tipo de request autenticado (interfaz con `user: { id, role, ... }`) en lugar de `any`, en `favorites`, `orders`, `cart` y `roles.guard`.
- **REQ-3.4** CUANDO `multer-image-options.factory.ts` y `openai.service.ts` se lintéen, EL SISTEMA DEBERÁ no producir errores `no-unsafe-*`, sin cambiar el comportamiento de la subida de imágenes ni de las llamadas a OpenAI.
- **REQ-3.5** CUANDO `category.service.ts` y `product.service.ts` descarten propiedades al actualizar, EL SISTEMA DEBERÁ hacerlo sin variables sin usar y sin cambiar qué campos se persisten.
- **REQ-3.6** CUANDO se corrija el lint, EL SISTEMA DEBERÁ no cambiar el comportamiento observable de ningún endpoint, verificable porque `npm test` y `npm run build` siguen en verde.

### REQ-4: CI bloqueante

- **REQ-4.1** CUANDO el CI corra el job `backend`, EL SISTEMA DEBERÁ fallar si falla `eslint` o `npm test` (sin `continue-on-error` en esos pasos).
- **REQ-4.2** CUANDO el CI corra el job `frontend`, EL SISTEMA DEBERÁ fallar si falla `ng test` (sin `continue-on-error` en ese paso).
- **REQ-4.3** CUANDO se sacen los `continue-on-error`, EL SISTEMA DEBERÁ eliminar también los comentarios `TODO` de `ci.yml` que los justificaban, y actualizar el apartado "Estado conocido" de `CLAUDE.md` y de `steering/tech.md`, que hoy dicen que lint y tests no bloquean.
- **REQ-4.4** CUANDO un pull request rompa un test o el lint, EL SISTEMA DEBERÁ impedir que los jobs `docker-*` y `deploy-*` se ejecuten, verificable porque dependen de los jobs `backend` y `frontend` mediante `needs`.
- **REQ-4.5** CUANDO el CI corra `npm audit --omit=dev --audit-level=critical` (backend y frontend), EL SISTEMA DEBERÁ fallar si hay al menos una vulnerabilidad crítica en dependencias de producción.
- **REQ-4.6** CUANDO el CI corra `npm audit --omit=dev` completo, EL SISTEMA DEBERÁ mostrar las vulnerabilidades altas y menores sin bloquear.

### REQ-5: Vulnerabilidades de dependencias

- **REQ-5.1** CUANDO se ejecute `npm audit --omit=dev` en `backend/`, EL SISTEMA DEBERÁ informar 0 vulnerabilidades críticas y 0 altas, salvo las que solo se resuelvan con un salto de versión mayor.
- **REQ-5.2** CUANDO se ejecute `npm audit --omit=dev` en `frontend/`, EL SISTEMA DEBERÁ informar 0 vulnerabilidades críticas y 0 altas, salvo las que solo se resuelvan con un salto de versión mayor.
- **REQ-5.3** CUANDO se actualicen dependencias, EL SISTEMA DEBERÁ mantener las versiones mayores actuales (NestJS 11, Angular 20, TypeORM 0.3, etc.) y no usar `npm audit fix --force`.
- **REQ-5.4** CUANDO una vulnerabilidad alta o crítica no pueda resolverse sin salto de versión mayor, EL SISTEMA DEBERÁ registrarla en `specs/pendientes.md` con el paquete, la severidad y la versión que la corrige.
- **REQ-5.5** CUANDO se actualicen las dependencias, EL SISTEMA DEBERÁ conservar en verde `npm run build` de backend y frontend, `npm test` y `ng test`, y la imagen del backend debe seguir construyéndose y corriendo como usuario no root.
- **REQ-5.6** CUANDO se actualicen dependencias, EL SISTEMA DEBERÁ modificar solo `package.json` y `package-lock.json` de cada proyecto, sin tocar código de la aplicación salvo que una actualización compatible lo exija y quede anotado en la spec.

### REQ-6: Verificación en un entorno limpio

- **REQ-6.1** CUANDO se terminen las tareas, EL SISTEMA DEBERÁ haber ejecutado, desde un `npm ci` limpio, los comandos de REQ-1.1, REQ-2.1, REQ-3.1, REQ-5.1 y REQ-5.2 y registrado su salida resumida en `tasks.md`.
- **REQ-6.2** CUANDO se abra el pull request, EL SISTEMA DEBERÁ mostrar en Actions los jobs `backend` y `frontend` en verde con los pasos de lint, tests y audit ya sin `continue-on-error`.
- **REQ-6.3** CUANDO se despliegue a producción con las dependencias actualizadas, EL SISTEMA DEBERÁ mantener `/api/health` en 200, un login correcto y la subida de una imagen funcionando (comprobación manual, mismos pasos que T13 de `infra-hardening`).

## 3. Auto-revisión

- **¿Hay requisitos que son dos mezclados?** REQ-1.2 y REQ-1.5 se separaron (reemplazar vs. borrar). REQ-4.3 mezclaba sacar `continue-on-error` con actualizar documentación: se mantiene junto porque es el mismo cambio y la documentación quedaría falsa si se hace por separado; si prefieren dos, se parte. REQ-5.5 junta varias verificaciones sobre un mismo resultado ("la actualización no rompe nada"); se verifica con una lista de comandos en las tareas.
- **¿Palabras no verificables?** Se reemplazó "pruebas con valor" por "al menos una prueba de un comportamiento real (camino feliz o error esperado)". "Mismo comportamiento" (REQ-3.6) se ancla en que `npm test` y el build sigan en verde, que es lo único que se puede comprobar sin e2e en CI.
- **¿Falta algún camino no feliz?** Cubierto: test que falla por causa de producción (REQ-2.4), vulnerabilidad sin arreglo compatible (REQ-5.4), aviso nuevo de un tercero que rompería el CI (decisión de bloquear solo en críticas, REQ-4.5/4.6). Riesgo conocido que no tiene requisito propio: una actualización compatible puede cambiar comportamiento en runtime; se mitiga con REQ-5.5 y REQ-6.3 y por eso el despliegue va con comprobación manual.
- **Riesgo de seguridad de las propias reglas:** el `AGENTS.md` prohíbe borrar archivos sin confirmación; REQ-1.5 lo respeta.
