# Requisitos: infra-hardening

## Contexto y decisiones

**Origen del pedido.** Tercera y última spec de la Fase 2 de la auditoría de `mi-catalogo-online` (`orders-integrity` y `catalog-access` ya están hechas y en la rama `fix/catalog-access`).

| Spec | Cubre |
|---|---|
| `orders-integrity` | Stock atómico, dinero exacto, estados de orden, vencimiento (hecha) |
| `catalog-access` | Catálogo público solo `PUBLISHED` y paginado, propiedad GUEST, tope de IA (hecha) |
| `infra-hardening` (esta) | Puertos, usuario no-root, Swagger, `CORS_ORIGIN`, `uploads/` fuera de git, dependencia `aide`, validación de config |

**Hechos verificados en el código (2026-10-13):**

- `docker-compose.yml:10-11` publica Postgres como `"5433:5432"` y `:42-43` publica el backend como `${BACKEND_PORT:-3000}:3000`. Según `frontend/nginx.conf`, `/api` lo enruta el nginx del borde (repo `web-stack`) directo al backend.
- `backend/Dockerfile` y `frontend/Dockerfile` no tienen `USER`: ambos procesos corren como root. El frontend usa `nginx:1.27-alpine` y escucha en el puerto 80. El compose del frontend publica `80` y `443` y monta `/etc/letsencrypt`, pero `nginx.conf` solo escucha en 80 (el TLS lo termina el borde).
- `main.ts:25-29` monta `/docs` y `/swagger/json` sin restricción y en cualquier entorno.
- `main.ts:45` hace `process.env.CORS_ORIGIN ?? '*'`: sin variable, cualquier origen puede llamar a la API.
- `backend/uploads/**` tiene 25 archivos versionados (5 `categories`, 17 `products`, 3 `profiles`) y no está en `.gitignore` ni en `backend/.dockerignore`: también entran a la imagen Docker.
- `backend/package.json` tiene `"aide": "…"` como script (línea 9) y `"aide": "..."` como dependencia (línea 41). En `package-lock.json` figura como `link: true` con `resolved: "..."`, y `node_modules/aide` no existe: es un resto de una instalación accidental.
- `env.model.ts` es solo una interfaz de TypeScript: nada valida las variables al arrancar. `app.module.ts:17` usa `ConfigModule.forRoot({ isGlobal: true })` sin esquema. Una `JWT_SECRET` o `DB_*` ausente se descubre recién cuando algo falla.
- En producción el volumen `uploads_data` ya contiene archivos escritos por root. Un backend con `USER node` no podría escribir en ellos sin un `chown` previo.
- El compose de producción vive en el repo `web-stack`, no acá. El deploy es por SSH desde `ci/docker-ghcr` (`.github/workflows/ci.yml`).

**Decisiones tomadas con el usuario (2026-10-13):**

1. **Puertos:** a Postgres y al backend solo se llega por la red interna de Docker (el nginx del borde llega al backend por ahí). Se quitan los `ports` de `db` y `backend` del compose; para trabajar en local hay un archivo `docker-compose.dev.yml` opt-in que los publica en loopback. _(Enmienda en fase de diseño: decía `docker-compose.override.yml`, pero Compose carga ese nombre automáticamente y volvería a publicar los puertos si alguien corre `docker compose up` en el servidor.)_
2. **No-root:** el backend corre con `USER node` y se resuelve el dueño del volumen de uploads; el frontend pasa a `nginxinc/nginx-unprivileged` escuchando en el puerto 8080, lo que obliga a cambiar el upstream en `web-stack`.
3. **Swagger:** apagado en producción, activo en desarrollo.
4. **`uploads/` en git:** se sacan del índice (`git rm --cached`, los archivos quedan en el disco y en el volumen de producción) y se ignoran en git y en Docker. Siguen en el historial.

## Fuera de alcance

- Editar el repo `web-stack` (compose de producción, nginx del borde): esta spec deja documentado qué cambia allí (puerto 8080 del frontend, `ports` de db y backend) pero lo aplica una persona.
- Cambiar el usuario SSH del deploy (`root@`) o su pipeline.
- Reescribir el historial de git para borrar los 25 archivos de `uploads/`.
- Mover las imágenes a S3/R2 con CDN y la validación de magic bytes en uploads (Fase 4).
- JWT, refresh token, `register` que revela si el email existe, SSRF de la IA (anotados en `pendientes.md`).
- Arreglar los tests y el lint de scaffold viejos ni quitar `continue-on-error` del CI (Fase 3).
- Healthchecks de contenedores y observabilidad (Fase 4).

## REQ-1: Postgres y el backend no se publican en el host

**Historia de usuario:** Como operador, quiero que la base y la API no sean alcanzables desde fuera de la red de Docker, para que solo se llegue a ellas por el nginx del borde.

### Criterios de aceptación
1. CUANDO se renderiza `docker-compose.yml` con `docker compose config` EL SISTEMA DEBERÁ mostrar el servicio `db` sin la clave `ports`.
2. CUANDO se renderiza `docker-compose.yml` con `docker compose config` EL SISTEMA DEBERÁ mostrar el servicio `backend` sin la clave `ports`.
3. CUANDO el backend se conecta a Postgres con `DB_HOST=db` y `DB_PORT=5432` EL SISTEMA DEBERÁ seguir conectando por la red interna de Docker.
4. CUANDO el desarrollador levanta el stack con `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` EL SISTEMA DEBERÁ publicar Postgres, el backend y el frontend (`127.0.0.1:8080`) únicamente en `127.0.0.1`.
5. CUANDO se ejecuta `docker compose up` sin `-f` (se carga solo `docker-compose.yml`) EL SISTEMA DEBERÁ no publicar ningún puerto de `db` ni de `backend`.

## REQ-2: Los contenedores no corren como root

**Historia de usuario:** Como operador, quiero que ningún proceso del stack corra como root dentro del contenedor, para limitar el daño si se compromete la aplicación.

### Criterios de aceptación
1. CUANDO se ejecuta `docker run --rm <imagen-backend> id -u` EL SISTEMA DEBERÁ imprimir un UID distinto de `0`.
2. CUANDO se ejecuta `docker run --rm <imagen-frontend> id -u` EL SISTEMA DEBERÁ imprimir un UID distinto de `0`.
3. CUANDO el contenedor del backend arranca con un volumen `uploads_data` vacío EL SISTEMA DEBERÁ poder escribir un archivo en `/app/uploads`.
4. CUANDO el contenedor del backend arranca con un volumen `uploads_data` cuyos archivos pertenecen a root EL SISTEMA DEBERÁ poder escribir un archivo nuevo en `/app/uploads/products` (el procedimiento de `chown` previo queda documentado y verificado en la tarea de despliegue).
5. CUANDO el contenedor del frontend arranca EL SISTEMA DEBERÁ servir `index.html` por el puerto 8080 con HTTP 200.
6. CUANDO se renderiza `docker-compose.yml` EL SISTEMA DEBERÁ mostrar el servicio `frontend` sin publicar los puertos `80` ni `443` y sin el montaje de `/etc/letsencrypt`.

## REQ-3: Swagger no se expone en producción

**Historia de usuario:** Como operador, quiero que la documentación de la API no sea pública en producción, para no regalar el mapa de endpoints.

### Criterios de aceptación
1. CUANDO el backend arranca con `NODE_ENV=production` EL SISTEMA DEBERÁ responder HTTP 404 en `GET /docs`.
2. CUANDO el backend arranca con `NODE_ENV=production` EL SISTEMA DEBERÁ responder HTTP 404 en `GET /swagger/json`.
3. CUANDO el backend arranca con `NODE_ENV` distinto de `production` EL SISTEMA DEBERÁ responder HTTP 200 en `GET /docs` y en `GET /swagger/json`.

## REQ-4: CORS nunca cae a comodín en producción

**Historia de usuario:** Como operador, quiero que una variable `CORS_ORIGIN` ausente o inválida impida arrancar en producción, para no abrir la API a cualquier origen sin darme cuenta.

### Criterios de aceptación
1. CUANDO el backend arranca con `NODE_ENV=production` y sin `CORS_ORIGIN` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre `CORS_ORIGIN`.
2. CUANDO el backend arranca con `NODE_ENV=production` y `CORS_ORIGIN=*` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre `CORS_ORIGIN`.
3. CUANDO `CORS_ORIGIN` contiene una lista separada por comas (`https://a.com, https://b.com`) EL SISTEMA DEBERÁ aceptar solo esos orígenes, sin espacios sobrantes.
4. CUANDO el backend arranca con `NODE_ENV` distinto de `production` y sin `CORS_ORIGIN` EL SISTEMA DEBERÁ permitir únicamente `http://localhost:4200` y `http://localhost:8080`.
5. CUANDO una petición llega desde un origen que no está en la lista EL SISTEMA DEBERÁ responder sin la cabecera `Access-Control-Allow-Origin`.

## REQ-5: La configuración se valida al arrancar

**Historia de usuario:** Como operador, quiero que el backend se niegue a arrancar con variables faltantes o mal formadas, para enterarme en el despliegue y no cuando un usuario dispara el error.

### Criterios de aceptación
1. CUANDO el backend arranca sin `JWT_SECRET` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre `JWT_SECRET`.
2. CUANDO `JWT_SECRET` tiene menos de 32 caracteres y `NODE_ENV=production` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0`.
3. CUANDO el backend arranca sin `DB_HOST` ni `POSTGRES_HOST` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre la variable faltante.
4. CUANDO falta cualquiera de `DB_NAME`, `DB_USER` o `DB_PASSWORD` (y su equivalente `POSTGRES_*`) EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre la variable faltante.
5. CUANDO `PORT`, `DB_PORT`, `ORDER_PAYMENT_TTL_HOURS`, `AI_RATE_LIMIT` o `AI_RATE_TTL_SECONDS` no son un entero positivo EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre la variable.
6. CUANDO hay más de una variable inválida EL SISTEMA DEBERÁ listarlas todas en un único mensaje de error.
7. CUANDO todas las variables son válidas EL SISTEMA DEBERÁ arrancar sin cambiar su comportamiento actual, usando los mismos valores por defecto que hoy (`PORT=3000`, `ORDER_PAYMENT_TTL_HOURS=48`, `AI_RATE_LIMIT=20`, `AI_RATE_TTL_SECONDS=3600`).
8. CUANDO falta `OPENAI_API_KEY`, `RESEND_API_KEY` o `CONTACT_TO_EMAIL` EL SISTEMA DEBERÁ terminar con código de salida distinto de `0` y un mensaje que nombre la variable, junto con el resto de los errores de configuración. _(Enmienda en implementación, T7: el texto original decía que `OPENAI_API_KEY` era opcional, pero `OpenaiService`, `MailService` y `ContactService` ya lanzan un error en su constructor si falta la variable correspondiente, así que el backend nunca arrancó sin ellas. No cambia el comportamiento: solo adelanta el error y lo junta con los demás. Decisión del usuario, 2026-10-13.)_
9. CUANDO se ejecuta un comando de migración (`migrations:run:prod`) EL SISTEMA DEBERÁ seguir leyendo la conexión de `ormconfig.ts` sin exigir las variables de la aplicación (`JWT_SECRET`, `CORS_ORIGIN`).

## REQ-6: `uploads/` deja de estar en git y en las imágenes

**Historia de usuario:** Como desarrollador, quiero que las imágenes subidas por usuarios no se versionen ni viajen dentro de la imagen Docker, para no mezclar datos con código.

### Criterios de aceptación
1. CUANDO se ejecuta `git ls-files backend/uploads` EL SISTEMA DEBERÁ no listar ningún archivo de imagen.
2. CUANDO se ejecuta `git check-ignore backend/uploads/products/x.jpg` EL SISTEMA DEBERÁ indicar que el archivo está ignorado.
3. CUANDO se construye la imagen del backend EL SISTEMA DEBERÁ no copiar `uploads/` al contexto (`backend/.dockerignore` incluye `uploads`).
4. CUANDO los 25 archivos se quitan del índice EL SISTEMA DEBERÁ conservarlos en el disco local (la operación usa `git rm --cached`).
5. CUANDO el backend arranca y el directorio de uploads no existe EL SISTEMA DEBERÁ crearlo (comportamiento actual de `main.ts`, que no debe romperse).

## REQ-7: Se elimina la dependencia fantasma `aide`

**Historia de usuario:** Como desarrollador, quiero que `npm install` desde cero no dependa de un paquete inexistente, para que el entorno se reconstruya sin sorpresas.

### Criterios de aceptación
1. CUANDO se lee `backend/package.json` EL SISTEMA DEBERÁ no contener la clave `aide` ni en `scripts` ni en `dependencies`.
2. CUANDO se lee `backend/package-lock.json` EL SISTEMA DEBERÁ no contener ninguna entrada `aide`.
3. CUANDO se ejecuta `npm ci` en un clon limpio de `backend/` EL SISTEMA DEBERÁ terminar sin errores.
4. CUANDO se ejecuta `npm run build` después de `npm ci` EL SISTEMA DEBERÁ terminar sin errores.

## REQ-8: Documentación de lo que cambia fuera de este repo

**Historia de usuario:** Como operador, quiero un checklist de despliegue explícito, para aplicar los cambios de `web-stack` y del volumen en el orden correcto.

### Criterios de aceptación
1. CUANDO termina la implementación EL SISTEMA DEBERÁ incluir en `.claude/specs/infra-hardening/tasks.md` un checklist manual con: cambio del upstream del frontend a `:8080` en `web-stack`, retiro de `ports` en db y backend, y `chown` del volumen `uploads_data`.
2. CUANDO se actualizan `README.md` y `backend/.env-example` EL SISTEMA DEBERÁ listar `CORS_ORIGIN` como obligatoria en producción, `NODE_ENV` y la mención de que Swagger está apagado en producción.

---

## Auto-revisión

- **¿Algún requisito mezcla dos ideas?** REQ-5.2 y REQ-5.3 se separaron de la validación genérica de `JWT_SECRET` y de `DB_*`. REQ-4.1 y 4.2 son dos entradas distintas (ausente vs. `*`) con la misma salida; se dejaron separadas por ser casos de entrada inválida distintos.
- **¿Criterios no verificables?** Se evitaron adjetivos. REQ-2.4 (volumen con archivos de root) solo se verifica de verdad contra el volumen real, por eso lo ata a la tarea de despliegue manual.
- **¿Caminos no felices cubiertos?** Entrada inválida (REQ-4, REQ-5), estado vacío (REQ-2.3, REQ-6.5), dependencia externa (REQ-5.8: OpenAI opcional). No aplican permisos/roles.
- **Riesgos que quedan abiertos:** (a) el cambio de puerto del frontend rompe producción si `web-stack` no se actualiza en el mismo despliegue (se cubre con el checklist de REQ-8); (b) un `JWT_SECRET` de producción de menos de 32 caracteres impediría arrancar tras desplegar: hay que revisarlo antes.
