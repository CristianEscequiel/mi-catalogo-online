# Tareas: infra-hardening

Leyenda: **[O]** obligatoria · **[Opt]** opcional · `Dep:` tareas que deben estar hechas antes · `Cubre:` criterios de `requirements.md` · `Verifica:` cómo se comprueba que quedó bien.

Reglas de trabajo (de `AGENTS.md` y de la memoria del proyecto): no se toca ningún `.env`; no se borran archivos sin confirmar; no se commitea salvo que el usuario lo pida, y el código y los docs de la spec van en commits separados.

Orden: primero lo que deja el repo limpio y compilando (T1, T2), después el backend de adentro hacia afuera (T3 → T7), después los contenedores (T8 → T11), y al final documentación y cierre (T12 → T14). Independientes entre sí: T1 y T2; T3 y T4; T8, T9 y T10 (T11 las junta).

---

## Bloque A: higiene del repo

- [x] **T1. [O] Eliminar la dependencia fantasma `aide`.**
  - Hacer: borrar `"aide": "…"` de `scripts` y `"aide": "..."` de `dependencies` en `backend/package.json`; borrar del `package-lock.json` la línea `"aide"` en `packages[""].dependencies` y el bloque `node_modules/aide`.
  - Dep: ninguna.
  - Cubre: REQ-7.1, 7.2, 7.3, 7.4.
  - Verifica: `grep -n aide backend/package.json backend/package-lock.json` sin resultados; en una copia limpia (`git stash`-free: copiar `package*.json` a una carpeta temporal del scratchpad) `npm ci` termina en 0; en `backend/` `npm run build` termina en 0.

- [x] **T2. [O] Sacar `backend/uploads/` de git y de la imagen Docker.**
  - Hacer: agregar `backend/uploads/` al `.gitignore` raíz y `uploads` a `backend/.dockerignore`. **Pedir confirmación al usuario** y recién ahí ejecutar `git rm -r --cached backend/uploads` (los archivos quedan en el disco).
  - Dep: ninguna.
  - Cubre: REQ-6.1, 6.2, 6.3, 6.4.
  - Verifica: `git ls-files backend/uploads` vacío; `git check-ignore -v backend/uploads/products/x.jpg` indica la regla; `ls backend/uploads/products | wc -l` sigue siendo 17 o más (los archivos no se borraron del disco); `git status` muestra los 25 archivos como borrados del índice y no como borrados del disco.

## Bloque B: configuración del backend

- [x] **T3. [O] `validateEnv` con sus pruebas unitarias.**
  - Hacer: crear `backend/src/config/env.validation.ts` con `validateEnv(raw)` según la tabla de C1 del diseño (acumula todos los errores, mensaje único, devuelve `raw` sin cambios). Crear `env.validation.spec.ts` con imports relativos.
  - Dep: ninguna.
  - Cubre: REQ-4.1, 4.2, REQ-5.1 a 5.8.
  - Verifica: `npx jest src/config/env.validation.spec.ts` en verde, con casos para: entorno completo válido (devuelve el mismo objeto); falta `JWT_SECRET`; secreto de 31 caracteres con `NODE_ENV=production` falla y con 32 pasa; secreto corto en desarrollo pasa; falta cada una de `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` (el mensaje nombra la variable); alternativa `POSTGRES_*` válida; `PORT` y las otras cuatro numéricas con `0`, `-1`, `1.5`, `abc`, vacío; varias inválidas a la vez (un solo `Error` con todas); `CORS_ORIGIN` ausente, `*` y `a.com,*` en producción fallan, y ausente en desarrollo pasa; falta cada una de `OPENAI_API_KEY`, `RESEND_API_KEY` y `CONTACT_TO_EMAIL` falla nombrando la variable (REQ-5.8 enmendado).

- [x] **T4. [O] `resolveCorsOrigins` con sus pruebas unitarias.**
  - Hacer: crear `backend/src/config/cors.ts` y `cors.spec.ts` según C2.
  - Dep: ninguna.
  - Cubre: REQ-4.3, 4.4.
  - Verifica: `npx jest src/config/cors.spec.ts` en verde: `"https://a.com, https://b.com"` → `['https://a.com','https://b.com']`; elementos vacíos descartados; `undefined` en desarrollo → los dos orígenes `localhost`; `undefined` en producción lanza (nunca devuelve `*`).

- [x] **T5. [O] Cablear `configureApp`, `validate` en `AppModule` y `main.ts` delgado.**
  - Hacer: crear `backend/src/app.setup.ts` con `configureApp(app)` (pipes, serializer, Swagger solo si `NODE_ENV !== 'production'`, helmet, `/uploads` con creación del directorio, CORS con `resolveCorsOrigins`, `trust proxy`); en `app.module.ts` pasar `validate: validateEnv` a `ConfigModule.forRoot`; reducir `main.ts` a `create` → `configureApp` → `listen`, con `bootstrap().catch(err => { console.error(err.message); process.exit(1); })`; agregar `NODE_ENV` a `Env`.
  - Dep: T3, T4.
  - Cubre: REQ-3.1 a 3.3, REQ-4.1 a 4.5, REQ-6.5, REQ-5.7.
  - Verifica: `npm run build` en 0; `npx jest` en `backend/` no agrega suites rotas respecto de la línea base (hoy fallan `openai.service`, `mail.service`, `auth.service`, `auth.controller`, `users.service`, `users.controller`); T6 y T7 cubren el comportamiento.

- [x] **T6. [O] Prueba de integración de Swagger y CORS.**
  - Hacer: crear `backend/test/infra-config.e2e-spec.ts` con un módulo mínimo (`HealthModule` + `ConfigModule`) y `configureApp`; sin base de datos. Ajustar `UPLOADS_DIR` a una carpeta temporal.
  - Dep: T5.
  - Cubre: REQ-3.1, 3.2, 3.3, REQ-4.3, 4.5, REQ-6.5.
  - Verifica: `npx jest --config test/jest-e2e.json --runInBand test/infra-config.e2e-spec.ts` en verde: con `NODE_ENV=production` `GET /docs` y `GET /swagger/json` dan 404; con `development` dan 200; una petición con `Origin` permitido recibe `Access-Control-Allow-Origin` igual al origen y una con `Origin` no listado no recibe esa cabecera; el directorio de uploads inexistente se crea al arrancar.

- [x] **T7. [O] Verificación de arranque real (sin Docker).**
  - Hacer: `npm run build` y ejecutar `node dist/main` con variables mínimas válidas más cada caso inválido. No tocar `backend/.env`: pasar las variables por línea de comando.
  - Dep: T5.
  - Cubre: REQ-4.1, 4.2, REQ-5.1 a 5.6, 5.9.
  - Verifica (registrar la salida en esta tarea al completarla): sin `CORS_ORIGIN` y con `NODE_ENV=production` → mensaje que nombra `CORS_ORIGIN` y código de salida `1`; con `CORS_ORIGIN=*` → igual; sin `JWT_SECRET` → nombra `JWT_SECRET` y sale `1`; `PORT=abc` y `AI_RATE_LIMIT=0` a la vez → un único mensaje con las dos; entorno válido contra la base de pruebas → arranca y `GET /health` da 200; `npm run migrations:run:prod` sin `JWT_SECRET` ni `CORS_ORIGIN` (solo `DB_*`) → no falla por configuración.

## Bloque C: contenedores

- [x] **T8. [O] Backend con `USER node`.**
  - Hacer: editar la etapa `runner` de `backend/Dockerfile` según C4 (`mkdir -p /app/uploads && chown -R node:node /app` y `USER node`).
  - Dep: T2 (para que `uploads/` no entre al contexto de build).
  - Cubre: REQ-2.1, 2.3.
  - Verifica (requiere Docker): `docker build -t catalog-backend:test backend` en 0; `docker run --rm catalog-backend:test id -u` imprime `1000`; con un volumen nuevo `docker run --rm -v t_up:/app/uploads catalog-backend:test sh -c "touch /app/uploads/x && echo ok"` imprime `ok`. Si Docker no está disponible en esta máquina, anotarlo y dejar la verificación para el CI/servidor.

- [x] **T9. [O] Frontend sin root en el 8080.**
  - Hacer: en `frontend/Dockerfile` cambiar la etapa `runner` a `nginxinc/nginx-unprivileged:1.27-alpine` y `EXPOSE 8080`; en `frontend/nginx.conf` cambiar `listen 80;` por `listen 8080;`.
  - Dep: ninguna.
  - Cubre: REQ-2.2, 2.5.
  - Verifica (requiere Docker): `docker build -t catalog-frontend:test frontend` en 0; `docker run --rm catalog-frontend:test id -u` imprime un UID distinto de `0`; `docker run -d -p 127.0.0.1:18080:8080 catalog-frontend:test` y `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/` da `200`; una ruta del SPA (`/product/x`) también da `200` (el `try_files` sigue funcionando).

- [x] **T10. [O] Compose sin puertos publicados y `docker-compose.dev.yml`.**
  - Hacer: en `docker-compose.yml` quitar `ports` de `db` y `backend` y de `frontend`, quitar el montaje de `/etc/letsencrypt` y la variable `BACKEND_PORT`; crear `docker-compose.dev.yml` según C6; en `backend/docker-compose.yml` cambiar el puerto de `db` a `127.0.0.1:${DB_EXTERNAL_PORT:-5433}:5432`.
  - Dep: ninguna (se integra en T11).
  - Cubre: REQ-1.1, 1.2, 1.4, 1.5, REQ-2.6.
  - Verifica: `DB_PASSWORD=x JWT_SECRET=x docker compose config` no muestra ninguna clave `ports` ni `/etc/letsencrypt`; con `-f docker-compose.yml -f docker-compose.dev.yml config` aparecen los tres puertos y cada uno empieza con `127.0.0.1`. (`docker compose config` no necesita que el motor esté corriendo.)

- [x] **T11. [O] Pila completa levantada y volumen heredado de root.**
  - Hacer: levantar `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` con un `.env` temporal fuera del repo (en el scratchpad) que tenga `DB_PASSWORD`, un `JWT_SECRET` de 32+ caracteres y `CORS_ORIGIN`. Después reproducir el problema del volumen: crear un volumen con un archivo propiedad de root, arrancar el backend, intentar subir una imagen y comprobar el fallo; aplicar el `chown` del checklist (T13) y comprobar que ya funciona.
  - Dep: T7, T8, T9, T10.
  - Cubre: REQ-1.3, REQ-2.4, REQ-2.5.
  - Verifica (requiere Docker): el backend arranca, corre las migraciones y `curl http://127.0.0.1:3000/health` da 200 con la base solo por la red interna; sin el `chown`, escribir en `/app/uploads/products` da `EACCES`; con él, funciona. Registrar los comandos exactos que funcionaron para pasarlos a T13.

## Bloque D: documentación y despliegue

- [x] **T12. [O] Documentación y variables de ejemplo.**
  - Hacer: actualizar `README.md` y `backend/.env-example` con `NODE_ENV`, `CORS_ORIGIN` (obligatoria en producción, sin `*`), `JWT_SECRET` (mínimo 32 caracteres en producción), el uso de `docker-compose.dev.yml` y la nota de que Swagger está apagado en producción. Antes de quitar `MY_VAR` de `.env-example` y de `Env`, `grep -rn MY_VAR backend/src backend/test`; si algo lo usa, dejarlo.
  - Dep: T5, T10.
  - Cubre: REQ-8.2.
  - Verifica: `grep -n "CORS_ORIGIN" README.md backend/.env-example` los muestra; el README ya no menciona `BACKEND_PORT` ni los puertos 5433/3000 publicados por defecto; revisión visual del diff.

- [x] **T13. [O] Checklist de despliegue manual** (lo ejecuta una persona; esta tarea es dejarlo escrito y verificado contra T11).
  - Hacer: completar abajo, con los comandos reales que funcionaron en T11. Orden obligatorio:
    1. [x] `JWT_SECRET` de producción con 32+ caracteres y `CORS_ORIGIN` definida y distinta de `*`.
    2. [ ] _(sin evidencia de que se haya corrido)_ En el servidor, **antes** de desplegar el backend: `docker run --rm -v <volumen_uploads_data>:/app/uploads alpine chown -R 1000:1000 /app/uploads` (una sola vez; el backend anterior, que corre como root, sigue funcionando con el volumen ya corregido).
    3. [x] En `web-stack`: cambiar el upstream del frontend a `catalog_frontend:8080` **en el mismo despliegue** que la imagen nueva del frontend, y el healthcheck de `catalog_frontend` al 8080. (Los `ports` de db y backend no existían en `web-stack`: nada que quitar.)
    4. [ ] _(parcial: backend sano con la imagen nueva; falta la subida de imagen de prueba)_ Desplegar el backend; comprobar `GET /health` y subir una imagen de prueba.
    5. [x] Desplegar el frontend; comprobar el sitio y una ruta del SPA.
    6. [ ] _(parcial: /api/docs da 404; falta comprobar el 5433 desde fuera)_ Comprobar que `https://<dominio>/api/docs` da 404 y que el puerto 5433 del servidor no responde desde fuera.
  - Dep: T11.
  - Cubre: REQ-8.1 (y deja trazado REQ-2.4 en producción).
  - Verifica: el checklist figura completo y con comandos copiables en este archivo; el usuario lo revisa. Los pasos 1 a 6 se tildan **cuando se ejecutan en producción**, no al escribir el documento.

- [x] **T14. [O] Cierre de la spec.**
  - Hacer: recorrer los 8 requisitos y sus criterios uno por uno y anotar en una sección `## Cierre` al final de este archivo: cumplido sí/no y una línea de evidencia (qué prueba pasó o qué se verificó a mano). Actualizar `specs/pendientes.md` (sección 3 pasa a "hecha", agregar lo que quede abierto) y la memoria del roadmap.
  - Dep: T1 a T13 (los pasos 1 a 6 de T13 pueden quedar abiertos y figurar como pendientes de despliegue).
  - Cubre: todos.
  - Verifica: la sección `## Cierre` existe, cada criterio tiene sí/no con evidencia, y los criterios que dependen de Docker o de producción y no se pudieron verificar figuran explícitamente como "no verificado".

## Opcionales

- [x] **T15. [Opt] Prueba de contenedor en el CI.** Agregar al job `backend` del CI un paso que construya la imagen y ejecute `docker run --rm <imagen> id -u` para que `USER node` no regrese por accidente. Dep: T8. Cubre: REQ-2.1. Verifica: el job pasa en un PR y falla si se quita `USER node` de prueba.
- [x] **T16. [Opt] `npm audit --omit=dev` informativo en el CI.** Sin bloquear. Fuera del alcance de los requisitos; solo si el usuario lo pide.

---

## Mapa de cobertura

| Requisito | Tareas |
|---|---|
| REQ-1 | T10, T11 |
| REQ-2 | T8, T9, T10, T11, T13 |
| REQ-3 | T5, T6 |
| REQ-4 | T3, T4, T5, T6, T7 |
| REQ-5 | T3, T5, T7 |
| REQ-6 | T2, T5, T6 |
| REQ-7 | T1 |
| REQ-8 | T12, T13 |

---

## Registro de implementación

- **T1 (2026-10-13):** `aide` borrado de `package.json` y del lockfile. `npm ci --ignore-scripts` en una copia limpia terminó en 0 (829 paquetes, sin `aide`); `npm run build` en 0.
- **T3 y T4:** `npx jest src/config` → 2 suites, 60 pruebas en verde.
- **T5:** build en 0. `npx jest` completo: fallan las mismas 6 suites de la línea base (`openai.service`, `mail.service`, `users.service`, `users.controller`, `auth.service`, `auth.controller`); no se agregó ninguna.
- **T6:** `npx jest --config test/jest-e2e.json --runInBand test/infra-config.e2e-spec.ts` → 11 pruebas en verde.
- **T7:** probado desde un directorio sin `.env` con `dist/` compilado y una base Postgres descartable. Producción sin `CORS_ORIGIN`, con `CORS_ORIGIN=*`, sin `JWT_SECRET`, con `JWT_SECRET` corto, `PORT=abc` + `AI_RATE_LIMIT=0` (un solo mensaje con las dos) y sin `DB_*` (cuatro errores juntos): todos salen con código `1` y nombran la variable. `migration:run` sin `JWT_SECRET` ni `CORS_ORIGIN` corre y termina en 0 (REQ-5.9). Arranque válido en producción: `/health` 200, `/docs` y `/swagger/json` 404, `Access-Control-Allow-Origin` solo para el origen listado, directorio de uploads creado.
- **Enmienda de REQ-5.8 (hallada en T7):** el backend ya no arrancaba sin `OPENAI_API_KEY`, `RESEND_API_KEY` ni `CONTACT_TO_EMAIL` (los constructores de `OpenaiService`, `MailService` y `ContactService` lanzan). Se pasó a validarlas como obligatorias en `validateEnv`; no cambia el comportamiento. Actualizados `requirements.md`, `design.md` y T3.
- **Cambio menor en `main.ts`:** `NestFactory.create(..., { abortOnError: false })` para que el error llegue al `.catch` y el código de salida sea `1` también en Linux (por defecto Nest hace `process.abort()`). Nest igual loguea el error con traza antes; el mensaje limpio sale al final.
- **T2 (2026-10-13):** `backend/uploads/` agregado a `.gitignore` y `uploads` a `backend/.dockerignore`. Con confirmación del usuario se ejecutó `git rm -r --cached backend/uploads`: `git ls-files backend/uploads` da 0, los 25 archivos siguen en el disco, `git check-ignore -v` indica la regla `.gitignore:68`.
- **T10:** `docker compose config` del compose base: sin `ports`, sin `/etc/letsencrypt`, sin `BACKEND_PORT`. Con `-f docker-compose.yml -f docker-compose.dev.yml`: los tres puertos con `host_ip: 127.0.0.1` (3000, 5433, 8080). `backend/docker-compose.yml` también en `127.0.0.1`. Se agregaron al `backend` del compose `OPENAI_API_KEY`, `RESEND_API_KEY` y `CONTACT_TO_EMAIL` como obligatorias (con `:?`), más `MAIL_FROM` y `FRONTEND_URL` con default, porque con REQ-5.8 enmendado el backend no arranca sin ellas y el compose no se las pasaba.
- **T12:** README (sección Docker), `.env-example` raíz (sin `FRONTEND_PORT`/`BACKEND_PORT`, que el compose ya no usa; con las tres claves obligatorias) y `backend/.env-example` (`NODE_ENV`, `CORS_ORIGIN`, `OPENAI_API_KEY`). `MY_VAR` se quitó de `.env-example` y de `Env` tras comprobar con grep que nada lo usa.
- **T8 (2026-10-13):** `docker build` en 0; `docker run --rm catalog-backend:test id -u` → `1000`; la imagen no trae archivos de `uploads/` (`.dockerignore` efectivo). Volumen nuevo: se escribe `/app/uploads/products/x`. Volumen creado por root **sin** `chown`: `touch: Permission denied` (reproduce el riesgo de despliegue). Con `docker run --rm -v <volumen>:/app/uploads alpine chown -R 1000:1000 /app/uploads`: la escritura funciona y el archivo viejo se conserva. (En Git Bash de Windows hay que anteponer `MSYS_NO_PATHCONV=1`, si no `/app/uploads` se convierte en una ruta de Windows.)
- **T9:** `docker build` en 0; `id -u` → `101`; `GET /` → 200 y `GET /product/x` → 200 en el puerto 8080.
- **T11:** pila completa con `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build` y un env-file temporal fuera del repo (borrado después). `db` healthy; el backend corre las 5 migraciones y `GET /health` → 200 contra la base por la red interna; `/docs` y `/swagger/json` → 404; frontend en `127.0.0.1:8080` → 200; CORS devuelve `Access-Control-Allow-Origin` para el origen configurado; `id -u` dentro de los contenedores: backend `1000`, frontend `101`; escritura en `/app/uploads/products` como `node` y servido por `/uploads` → 200; los tres puertos escuchan solo en `127.0.0.1`. Se eliminaron los contenedores, volúmenes y red de prueba (`infra_t11_*`).
- **T13:** checklist escrito arriba; el comando del `chown` quedó comprobado en T8. Los pasos 1 a 6 se tildan al ejecutarlos en producción.
- **Lint y regresión final:** `eslint` sin errores en los archivos nuevos o tocados; `jest` completo → 27 suites en verde, las mismas 6 que ya fallaban (preexistentes), 270 pruebas en verde (5 fallidas preexistentes, ninguna nueva). `tsc --noEmit` solo muestra el error preexistente de `auth.controller.spec.ts`.

---

## Cierre

Cada criterio de `requirements.md` con su evidencia. **Sí** = verificado; **No verificado** = depende de producción (ver T13).

### REQ-1: puertos
1. `db` sin `ports` — **Sí.** `docker compose config` del compose base no muestra `ports`.
2. `backend` sin `ports` — **Sí.** Ídem.
3. Conexión por la red interna — **Sí.** T11: el backend corrió migraciones y respondió `/health` con `DB_HOST=db`, sin ningún puerto de la base publicado salvo el de desarrollo.
4. Con `docker-compose.dev.yml`, todo en `127.0.0.1` — **Sí.** `config` muestra `host_ip: 127.0.0.1` en 3000, 5433 y 8080; `netstat` en T11 lo confirma.
5. `docker compose up` sin `-f` no publica nada — **Sí.** No existe `docker-compose.override.yml`, así que Compose carga solo el base, que no tiene `ports`.

### REQ-2: no-root
1. Backend UID ≠ 0 — **Sí.** `1000`.
2. Frontend UID ≠ 0 — **Sí.** `101`.
3. Volumen vacío escribible — **Sí.** T8 y T11.
4. Volumen heredado de root — **Sí en simulación, No verificado en producción.** T8: falla sin `chown` y funciona con él; el volumen real de producción queda en T13, paso 2.
5. Frontend sirve en 8080 con 200 — **Sí.** T9 y T11.
6. Compose sin 80/443 ni letsencrypt en `frontend` — **Sí.** `config` no los muestra.

### REQ-3: Swagger
1. `/docs` 404 en producción — **Sí.** e2e y proceso real (T7, T11).
2. `/swagger/json` 404 en producción — **Sí.** Ídem.
3. 200 fuera de producción — **Sí.** e2e (`development` y sin `NODE_ENV`).

### REQ-4: CORS
1. Producción sin `CORS_ORIGIN` no arranca — **Sí.** T7: mensaje nombra `CORS_ORIGIN`, código 1.
2. `CORS_ORIGIN=*` no arranca — **Sí.** T7.
3. Lista separada por comas, sin espacios — **Sí.** Unitaria (`cors.spec.ts`) y e2e.
4. Sin `CORS_ORIGIN` fuera de producción: solo `localhost:4200` y `:8080` — **Sí.** Unitaria y e2e.
5. Origen no listado sin `Access-Control-Allow-Origin` — **Sí.** e2e (GET y preflight) y T7/T11 con `curl`.

### REQ-5: validación de configuración
1. Sin `JWT_SECRET` no arranca — **Sí.** Unitaria y T7 (desde un directorio sin `.env`).
2. Secreto de menos de 32 en producción — **Sí.** Unitaria (31 falla, 32 pasa) y T7.
3. Sin `DB_HOST`/`POSTGRES_HOST` — **Sí.** Unitaria y T7.
4. Falta `DB_NAME`, `DB_USER` o `DB_PASSWORD` — **Sí.** Unitaria (cada una) y T7 (las cuatro juntas).
5. Enteros inválidos — **Sí.** Unitaria (`0`, `-1`, `1.5`, `abc`, vacío para las 6 variables) y T7.
6. Todas las inválidas en un único mensaje — **Sí.** Unitaria y T7 (`PORT=abc` + `AI_RATE_LIMIT=0`).
7. Entorno válido arranca sin cambiar el comportamiento — **Sí.** `validateEnv` devuelve el mismo objeto (prueba unitaria); T7 y T11 arrancan con defaults intactos. No se agregó ningún default nuevo.
8. Faltan `OPENAI_API_KEY`, `RESEND_API_KEY` o `CONTACT_TO_EMAIL` — **Sí.** Unitaria y T7 (_requisito enmendado en T7_).
9. Migraciones no exigen las variables de la aplicación — **Sí.** T7: `migration:run` terminó en 0 sin `JWT_SECRET` ni `CORS_ORIGIN`.

### REQ-6: `uploads/`
1. `git ls-files backend/uploads` vacío — **Sí.** 0 archivos.
2. `git check-ignore` — **Sí.** Regla `.gitignore:68`.
3. Fuera de la imagen — **Sí.** `.dockerignore` con `uploads`; la imagen tiene el directorio vacío.
4. Archivos conservados en disco — **Sí.** 25 archivos siguen en `backend/uploads`.
5. Se crea el directorio si no existe — **Sí.** e2e y T7.

### REQ-7: `aide`
1. Sin `aide` en `package.json` — **Sí.**
2. Sin `aide` en el lockfile — **Sí.**
3. `npm ci` limpio — **Sí.** Copia limpia, 829 paquetes, código 0; también el `npm ci` del build de Docker.
4. `npm run build` — **Sí.**

### REQ-8: documentación
1. Checklist en `tasks.md` — **Sí.** T13, con el upstream `:8080`, el retiro de `ports` y el `chown`.
2. README y `.env-example` — **Sí.** `CORS_ORIGIN` obligatoria, `NODE_ENV`, Swagger apagado en producción.

### Pendiente fuera del código (no verificado)
- Los 6 pasos de T13 en el servidor y en `web-stack`.
- El `JWT_SECRET` y el `CORS_ORIGIN` reales de producción cumplen las reglas (T13, paso 1).
- Que `web-stack` pase `OPENAI_API_KEY`, `RESEND_API_KEY` y `CONTACT_TO_EMAIL` al backend: ya hacía falta para arrancar, pero no pude verlo.

## Despliegue en producción (2026-10-13)

- **Primer intento (CI, `sha-c72c55b`):** el backend no arrancó y el servidor volvió solo a `sha-9fe406a`. Causa confirmada con las longitudes de las variables: `JWT_SECRET` tenía 14 caracteres y `validateEnv` exige 32 o más en producción. El resto de la configuración era válida. El frontend no se desplegó (depende del backend).
- **Corrección:** se rotó `JWT_SECRET` y se recreó el backend a mano (`deploy.sh` no aplica cambios del `.env`, solo cambia el tag).
- **Hallazgos al leer `web-stack` (no estaban en el checklist original):** el healthcheck de `catalog_frontend` consultaba el puerto 80, así que con la imagen nueva `deploy.sh` lo habría marcado no saludable y hecho rollback; hubo que cambiarlo al 8080 junto con el upstream del nginx del borde. Rama `fix/catalog-frontend-8080` en `web-stack` (commit `92ce657`). Además, esa rama sale de `feat/contact-form` y le faltan 4 commits de `master`: no se debe usar con `git checkout` en el servidor, solo mergear por PR.
- **502 transitorio:** entre el cambio del contenedor del frontend (8080) y la recarga del nginx del borde, el sitio devolvió 502. Es la ventana prevista; se resolvió recargando el nginx.
- **Verificado en producción:** `catalog_backend` y `catalog_frontend` corren `sha-c72c55b` y están `healthy`; `/` → 200; `/product/x` → 200; `/api/health` → `{"status":"ok"}` 200; `/api/docs` → 404.
- **Sin verificar:** subida de una imagen de prueba (depende del `chown` del volumen), que el puerto 5433 no responda desde fuera, y el `chown` en sí.

## Opcionales (2026-10-13)

- **T15:** paso nuevo en el job `backend` de `.github/workflows/ci.yml` que construye la imagen, ejecuta `id -u` y falla si es `0`. Verificado **solo en local**: la lógica del paso, ejecutada con `bash -e`, pasa con la imagen real (UID 1000) y falla (`exit=1`) forzando `--user 0`. **No verificado en GitHub Actions**: el job todavía no corrió con este cambio. Solo cubre el backend; el frontend (UID 101) no tiene el chequeo equivalente. El paso suma un `docker build` completo al job (~2 a 3 min).
- **T16:** `npm audit --omit=dev` informativo (`continue-on-error: true`) en los jobs `backend` y `frontend`. YAML validado. Hoy reportaría **24 vulnerabilidades en el backend (1 crítica, 12 altas)** y **15 en el frontend (2 críticas, 11 altas)**; son preexistentes y arreglarlas queda fuera de esta spec (candidato para la Fase 3).
