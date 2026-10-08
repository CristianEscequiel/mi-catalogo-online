# Tareas: contact-form

Prefijos por repo: **B** = `mi-catalogo-online/backend`, **F** = `portfolio-web/portfolio`, **W** = `web-stack`, **D** = despliegue y cierre.

## Convenciones

- Cada repo trabaja en su propia rama, que sale de su rama principal. Hoy `mi-catalogo-online` está en `chore/claude-code-sdd-flow` (donde vive esta spec) y `portfolio-web` en `ci/ssh-port-5068`; las ramas de implementación no se mezclan con esas. Nada se commitea ni se hace push sin tu pedido.
- Los grupos **B**, **F** y **W** no dependen entre sí y pueden hacerse en paralelo. **D** va después, en el orden indicado.
- Las tareas marcadas **(manual, usuario)** tocan el servidor de producción; yo no las ejecuto, te dejo los comandos exactos.
- Todos los comandos de **B** se corren en `backend/`; los de **F**, en `portfolio/`.
- Todas las tareas son obligatorias salvo las marcadas "Opcional".

---

## Backend (`mi-catalogo-online/backend`)

- [x] B-0. Línea base de tests y lint
  - Detalle: antes de cambiar nada, correr `npm test` y `npx eslint "{src,apps,libs,test}/**/*.ts"` y guardar en `specs/contact-form/baseline-backend.txt` qué suites fallan y cuántos errores de lint hay. Sirve para demostrar al final que no se rompió nada más.
  - Depende de: —
  - Verificación: el archivo existe con la lista de suites fallidas (el CI menciona 6 de 8; se confirma el número real).
  - _Requisitos: REQ-11.1, REQ-12.4_

- [x] B-1. Dependencia, variables de entorno y tipos
  - Detalle: `npm install @nestjs/throttler@^6.7.1`. Agregar `CONTACT_TO_EMAIL`, `CONTACT_RATE_LIMIT` y `CONTACT_RATE_TTL_SECONDS` a `Env` (`src/env.model.ts`) y a `.env-example` (sin valores reales; `CONTACT_RATE_*` como opcionales con los defaults comentados). No tocar ningún `.env`.
  - Depende de: B-0
  - Verificación: `npm run build` compila; `git diff` muestra solo `package.json`, `package-lock.json`, `env.model.ts` y `.env-example`; `grep` confirma que no hay valores reales.
  - _Requisitos: REQ-9.5, REQ-9.7_

- [x] B-2. `trust proxy` en `main.ts`
  - Detalle: agregar `app.getHttpAdapter().getInstance().set('trust proxy', 1)` antes de `listen`, con un comentario breve que explique el motivo (un solo nginx delante).
  - Depende de: B-0
  - Verificación: `npm run build` compila. El efecto sobre la IP se prueba en B-7 y en D-3. Revisar con `grep -rn "req.ip" src` que ningún código existente depende de la IP (hoy no hay usos).
  - _Requisitos: REQ-6.3, REQ-11.2_

- [x] B-3. `MailService.sendContactMessage`
  - Detalle: método nuevo en `src/mail/mail.service.ts` con `from: MAIL_FROM`, `replyTo`, asunto `"Contacto portfolio: <nombre sin saltos de línea>"`, HTML con `&`, `<`, `>`, `"` y `'` escapados y `<br>` por salto de línea, y versión `text`. Lanza si Resend devuelve `{ error }`. No modificar los métodos existentes. Test en archivo nuevo `src/mail/mail.service.contact.spec.ts` con `resend` mockeado con `jest.mock` y un `ConfigService` falso (imports relativos).
  - Depende de: B-1
  - Verificación: `npx jest src/mail/mail.service.contact.spec.ts` pasa con casos para `from`, `replyTo`, asunto con `\r\n` colapsado, HTML escapado (`<script>` aparece como `&lt;script&gt;`) y error de Resend. `git diff src/mail/mail.service.ts` solo agrega líneas.
  - _Requisitos: REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.6, REQ-1.7, REQ-1.8, REQ-11.1, REQ-12.1_

- [x] B-4. `CreateContactDto`
  - Detalle: `src/contact/dto/create-contact.dto.ts` con `name` (2–80), `email` (`IsEmail`, máx. 254) y `message` (10–2000), los tres con `@Transform` de recorte de espacios, `website` solo con `@IsOptional()`, y mensajes de error en castellano con el formato `"<campo>: <texto>"`. Anotar con `@ApiProperty`. Test `create-contact.dto.spec.ts` con un `ValidationPipe` de las mismas opciones que `main.ts` (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`).
  - Depende de: B-1
  - Verificación: `npx jest src/contact/create-contact.dto.spec.ts` cubre: límites inferior y superior de cada campo (incluido `"  a "` que tras recortar tiene 1 carácter), email inválido y de 255 caracteres, campo desconocido rechazado, `website` con cualquier valor aceptado, y que cada mensaje empieza con `name:`, `email:` o `message:`.
  - _Requisitos: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5, REQ-5.1 (declaración del campo), REQ-12.2_

- [x] B-5. `ContactService`
  - Detalle: `src/contact/contact.service.ts`. El constructor lee `CONTACT_TO_EMAIL` y lanza `Error` que nombra la variable si falta o no es un email válido. `submit(dto)`: honeypot → `Logger.warn` sin contenido y el mismo cuerpo de éxito sin invocar al mail; si no, `mail.sendContactMessage` dentro de `Promise.race` con 10 s; cualquier fallo → `Logger.error` (sin el mensaje del visitante) y `ServiceUnavailableException` con texto genérico fijo. Imports relativos. Test `contact.service.spec.ts` con `MailService` mockeado y `jest.useFakeTimers`.
  - Depende de: B-3, B-4
  - Verificación: `npx jest src/contact/contact.service.spec.ts`: envío correcto con `to` igual a `CONTACT_TO_EMAIL`; honeypot sin llamar al mail y con el mismo cuerpo; `{ error }`, excepción y timeout de 10 s → 503 con el mismo texto; el cuerpo del 503 no contiene el texto del error original; el log de error no contiene el mensaje del visitante; constructor falla con variable ausente y con valor inválido (el mensaje contiene `CONTACT_TO_EMAIL`).
  - _Requisitos: REQ-1.2, REQ-5.2, REQ-5.3, REQ-5.4, REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-9.1, REQ-9.2, REQ-12.1_

- [x] B-6. `ContactController`, `ContactModule` y registro en `AppModule`
  - Detalle: `POST /contact` con `@ApiTags('contact')` y `@UseGuards(ThrottlerGuard)` solo en este controller. `ContactModule` importa `MailModule` y `ThrottlerModule.forRootAsync` con `Number(config.get(...) ?? default)` (3 y 600 s; `ttl` en ms) y `errorMessage` en castellano. Agregar `ContactModule` a `AppModule`. No registrar el guard como `APP_GUARD`. Test `contact.controller.spec.ts` con el servicio mockeado.
  - Depende de: B-5
  - Verificación: `npx jest src/contact/contact.controller.spec.ts` (delegación y cuerpo `{ message }`; el 503 del servicio se propaga). `npm run build` compila. `grep -rn "APP_GUARD" src` sin resultados. `git diff src/app.module.ts` muestra solo el import y el alta del módulo.
  - _Requisitos: REQ-1.5, REQ-6.5, REQ-8.1, REQ-9.4, REQ-11.1, REQ-12.2, NFR-4, NFR-5_

- [x] B-7. Test de integración: límite, IP y CORS
  - Detalle: `src/contact/contact.integration.spec.ts` con `supertest`: levanta la app con `ContactModule`, `MailService` sobrescrito por un doble, y la misma configuración de `main.ts` (pipe global, `trust proxy` 1 y `enableCors` con los tres orígenes).
  - Depende de: B-2, B-6
  - Verificación: `npx jest src/contact/contact.integration.spec.ts`: las solicitudes 1–3 devuelven 201 y la 4 devuelve 429 con cabecera `Retry-After`, sin llamar al doble de mail; con `X-Forwarded-For` distinto en cada petición el contador es por IP (otra IP no recibe 429); una IP inyectada al inicio de la cabecera no evita el límite; `Origin: https://esceweb.com` y `https://www.esceweb.com` reciben `Access-Control-Allow-Origin`; un origen no listado no; un `POST` con cuerpo inválido devuelve 400 sin llamar al doble de mail; un endpoint existente (`GET /health`) responde sin límite después de más de 3 llamadas. **Si `Retry-After` no aparece, se corrige aquí y se anota en `design.md`.**
  - _Requisitos: REQ-6.1, REQ-6.2, REQ-6.3, REQ-2.6, REQ-6.4, REQ-6.5, REQ-7.1, REQ-7.2, REQ-7.3, REQ-12.3_

- [x] B-8. Cierre del backend: calidad y no regresión
  - Detalle: correr Prettier/ESLint solo sobre los archivos nuevos o modificados, `npm run build` y la suite completa. Comparar contra `baseline-backend.txt`. Revisar manualmente `npm run start:dev` con variables locales de prueba y probar `POST /contact` con un cliente HTTP, incluido el 400 y el honeypot.
  - Depende de: B-7
  - Resultado: ESLint/Prettier sin errores en los archivos tocados (`main.ts` conserva su único aviso previo `no-floating-promises`); build OK; suites que fallan idénticas a la línea base (las mismas 6); lint total 176 problemas, igual que antes. **No se hizo la prueba manual local con `start:dev`** (requiere PostgreSQL levantado): login y registro quedan cubiertos solo por la verificación de D-1/D-2.
  - Verificación: ESLint y Prettier sin errores en los archivos tocados; `npm run build` compila; los tests nuevos pasan; el conjunto de suites que fallan es **idéntico o menor** que en `baseline-backend.txt` (ninguna suite nueva rota); el login y el registro responden igual que antes en la prueba manual local.
  - _Requisitos: REQ-11.1, REQ-12.4, REQ-12.6, NFR-1_

---

## Portfolio (`portfolio-web/portfolio`)

- [x] F-0. Línea base de tests
  - Detalle: correr `npx ng test --no-watch --browsers=ChromeHeadless` y `npm run build -- --configuration production`; anotar el resultado y el tamaño del bundle inicial en `specs/contact-form/baseline-portfolio.txt`. El CI de este repo bloquea si los tests fallan.
  - Depende de: —
  - Verificación: archivo creado; se sabe si la línea base pasa y cuánto pesa el bundle (presupuesto: aviso a 500 kB, error a 1 MB).
  - _Requisitos: REQ-11.5, REQ-12.6_

- [x] F-1. Entornos, `API_BASE_URL` e `HttpClient`
  - Detalle: crear `src/environments/environment.ts` (`http://localhost:3000`) y `environment.prod.ts` (`https://catalog.esceweb.com/api`); agregar `fileReplacements` a la configuración `production` en `angular.json`; crear `src/app/core/api-base-url.token.ts`; en `app.config.ts` proveer el token con `environment.apiBaseUrl` y `provideHttpClient(withFetch())`.
  - Depende de: F-0
  - Verificación: `npm run build -- --configuration production` compila y `grep -r "catalog.esceweb.com/api" dist/portfolio/browser` encuentra la URL; `npm run build -- --configuration development` compila y contiene `localhost:3000`; `grep -rn "esceweb.com" src/app` sin resultados en componentes ni servicios.
  - _Requisitos: REQ-10.1, REQ-10.2, REQ-10.3_

- [x] F-2. `ContactApiService`
  - Detalle: `src/app/page/contact/contact-api.service.ts` con `send(payload): Observable<void>`, URL `${API_BASE_URL}/contact`, `timeout(15000)` y mapeo del error HTTP a `ContactError` (`validation`, `rate-limit`, `server`, `network`, `timeout`). En 400, cada texto `"campo: texto"` va al campo; lo demás a `general`. Tests con `HttpTestingController`.
  - Depende de: F-1
  - Verificación: `contact-api.service.spec.ts` pasa: la petición va a `API_BASE_URL + '/contact'` con método `POST` y cuerpo JSON; 400 con `["name: x", "property y should not exist"]` → `fields.name` y `general`; 429 → `rate-limit`; 500 y 503 → `server`; status 0 → `network`; sin respuesta a los 15 s (con `fakeAsync`) → `timeout` y la petición queda cancelada.
  - _Requisitos: REQ-4.4, REQ-4.5, REQ-4.6, REQ-4.7, REQ-4.9, REQ-10.3, REQ-12.5_

- [x] F-3. `ContactForm`: estructura, validación y accesibilidad
  - Detalle: componente standalone `OnPush` en `src/app/page/contact/contact-form.{ts,html}` con Reactive Forms: `name`, `email`, `message` y el honeypot `website`. Validadores espejo de REQ-2 sobre el valor recortado; etiquetas `<label>` visibles; mensajes de error en castellano bajo cada campo tras `blur` o intento de envío; `aria-invalid` y `aria-describedby`; contador `n / 2000`; foco al primer campo inválido; campo `website` fuera de pantalla con `tabindex="-1"`, `aria-hidden="true"` y `autocomplete="off"`. Clases de DaisyUI/Tailwind ya usadas en la landing. Todavía sin envío.
  - Depende de: F-1
  - Verificación: `contact-form.spec.ts` (parte de validación) pasa: errores visibles solo tras `blur`/envío; un envío inválido no llama al servicio (espía) y deja el foco en el primer campo con `aria-invalid="true"`; el error desaparece al corregir; cada `input` tiene un `<label>` asociado; el contador cambia al escribir; el honeypot existe, está oculto y no es enfocable con teclado; el email de contacto no aparece en el DOM inicial.
  - _Requisitos: REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.5, REQ-3.6, REQ-3.7, REQ-4.11, REQ-5.1, REQ-12.5, NFR-2_

- [x] F-4. `ContactForm`: envío, estados y feedback
  - Detalle: conectar el envío con `ContactApiService`. Estado `idle | sending | success | error` con signals; en `sending` el botón queda deshabilitado con el texto "Enviando…"; éxito con `form.reset()`; `rate-limit`, `validation` (errores por campo con `setErrors` o mensaje general) y `server`/`network`/`timeout` con mensaje general que incluye `esce.arguello21@gmail.com`; los valores se conservan en errores; región `aria-live="polite"` para éxito y `role="alert"` para errores; posibilidad de reenviar sin recargar. Siempre se envía `website` (vacío para humanos).
  - Depende de: F-2, F-3
  - Verificación: `contact-form.spec.ts` (parte de envío) con el servicio mockeado: durante el envío el botón está deshabilitado y dice "Enviando…"; 201 → texto de éxito y formulario vacío; 429 → texto de demasiados intentos; 400 con campo → error bajo ese campo; 400 sin campo → mensaje general; 5xx y red → mensaje con el email y valores conservados; tras un error el botón se rehabilita y se puede reenviar; el payload incluye `website: ''`; el email no aparece en `idle`, `sending` ni `success`.
  - _Requisitos: REQ-1.1, REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4, REQ-4.5, REQ-4.6, REQ-4.7, REQ-4.8, REQ-4.9, REQ-4.10, REQ-4.11, REQ-12.5_

- [x] F-5. Integración en la landing y limpieza
  - Detalle: en `landing.html`, dentro de `<section id="contact">`, mantener el `id` y el título "Contactame" y reemplazar el bloque del email y el botón "Copiar" por `<app-contact-form>`; importar `ContactForm` en `landing.ts`. Antes de borrar, confirmar con `grep` que `copyEmail`, `isCopying`, `isEmailCopied`, `showCopyToast`, `copyFeedbackTimeout`, `faCopy`, `faCheck` y el toast de la línea 3 de `landing.html` solo los usa el bloque de copiado; si es así, eliminarlos. No tocar el resto de la landing. Ajustar `landing.spec.ts` si necesita `provideHttpClient`.
  - Depende de: F-4
  - Resultado: 34 tests pasan (3 previos + 31 nuevos); build de producción OK, bundle inicial 472,67 kB (línea base 398,88 kB; aviso del presupuesto a 500 kB, así que queda poco margen). Verificación visual con Chrome headless y CDP: en 320 px no hay desborde dentro de `#contact`, pero **la página completa sí desborda a 320 px (345 px de ancho) por elementos ajenos a la sección de contacto (hero/navbar), problema previo que no se tocó**; con teclado el orden es nombre, email, mensaje, botón y nunca el honeypot; Enter envía; sin backend se muestra el error con el email alternativo y se conservan los valores; ambos temas se ven bien.
  - Verificación: `npx ng test --no-watch --browsers=ChromeHeadless` pasa completo (incluido `landing.spec.ts`); `npm run build -- --configuration production` compila sin superar el presupuesto de bundle y se compara con `baseline-portfolio.txt`; `git diff --stat` solo muestra los archivos de contacto, `landing.*`, entornos, `app.config.ts` y `angular.json`. Verificación manual con `npm start` y el backend local: los enlaces `#contact` del menú y del hero llevan a la sección, a 320 px de ancho no hay barra horizontal, el formulario se completa y envía solo con teclado con foco visible, y se ve bien en los temas `business` y `corporate`.
  - _Requisitos: REQ-11.4, REQ-11.5, REQ-12.5, REQ-12.6, NFR-1, NFR-2, NFR-3, NFR-6_

---

## web-stack

- [x] W-1. Compose y variables de entorno
  - Detalle: en el servicio `catalog_backend` de `docker-compose.yml`: `CORS_ORIGIN: https://catalog.esceweb.com,https://esceweb.com,https://www.esceweb.com`; `CONTACT_TO_EMAIL: ${CONTACT_TO_EMAIL:?CONTACT_TO_EMAIL is required}`; `CONTACT_RATE_LIMIT: ${CONTACT_RATE_LIMIT:-3}`; `CONTACT_RATE_TTL_SECONDS: ${CONTACT_RATE_TTL_SECONDS:-600}`. En `.env.example`: `CONTACT_TO_EMAIL=` en la sección catalog y las dos variables de límite como opcionales. No tocar `.env` ni `nginx/default.conf`.
  - Depende de: —
  - Verificación: crear en el directorio temporal de la sesión un archivo con valores ficticios derivado de `.env.example` y correr `docker compose --env-file <ese archivo> config --quiet` (sin error, y falla con el mensaje correcto si se quita `CONTACT_TO_EMAIL`); `docker compose config` muestra los tres orígenes en `CORS_ORIGIN`; `git diff` muestra solo `docker-compose.yml` y `.env.example`.
  - _Requisitos: REQ-7.4, REQ-9.5, REQ-9.6, REQ-9.7_

- [x] W-2. Documentar las variables nuevas (opcional)
  - Detalle: una línea en el `README.md` de `web-stack` que mencione `CONTACT_TO_EMAIL` y que el cambio de compose requiere `git pull` y `up -d` en el servidor.
  - Depende de: W-1
  - Opcional: sí
  - Verificación: revisión visual del diff.
  - _Requisitos: REQ-9.5_

---

## Despliegue y cierre

El orden es obligatorio: `deploy.sh` solo cambia el tag de la imagen y **no aplica cambios al compose ni al `.env`** del servidor.

- [ ] D-1. Aplicar la configuración en el servidor **(manual, usuario)**
  - Detalle: merge de W-1. En el servidor, desde el directorio del stack: `git pull`; agregar `CONTACT_TO_EMAIL=esce.arguello21@gmail.com` al `.env` (permisos 600); `docker compose config --quiet`; `docker compose up -d --no-deps catalog_backend`. La imagen actual del backend ignora las variables nuevas.
  - Depende de: W-1
  - Verificación: `docker compose ps catalog_backend` en estado `healthy`; el catálogo (`https://catalog.esceweb.com`) sigue funcionando; desde un navegador en esa web el login responde como siempre.
  - _Requisitos: REQ-7.4, REQ-7.5, REQ-9.6_

- [ ] D-2. Desplegar el backend
  - Detalle: merge de las ramas B a la principal. El CI publica la imagen y `deploy.sh catalog-back sha-…` hace el `pg_dump` previo, cambia el tag y espera `healthy`.
  - Depende de: B-8, D-1
  - Verificación: el job de deploy termina en verde; si queda `unhealthy`, `deploy.sh` vuelve solo al tag anterior (se revisa el log del job). `docker compose logs --tail 50 catalog_backend` no muestra errores de arranque.
  - _Requisitos: REQ-9.2, REQ-11.1_

- [ ] D-3. Verificar el backend en producción con `curl`
  - Detalle: antes de desplegar el portfolio, probar contra `https://catalog.esceweb.com/api/contact`: preflight `OPTIONS` con `Origin: https://esceweb.com`; el mismo con un origen no listado; un `POST` válido; un `POST` con `website` lleno; un `POST` con campos inválidos; cuatro `POST` seguidos; y una repetición con una cabecera `X-Forwarded-For` inventada para comprobar que no evita el límite.
  - Depende de: D-2
  - Verificación: preflight con `Access-Control-Allow-Origin: https://esceweb.com` y sin esa cabecera para el origen no listado; 201 y el mail llega a la casilla con el remitente de `MAIL_FROM` y `reply-to` igual al email enviado; honeypot → 201 y **no** llega mail; inválido → 400 con mensajes `campo: texto`; cuarto envío → 429 con `Retry-After`; con `X-Forwarded-For` inventado sigue el 429; a los 10 minutos vuelve a aceptar. Los envíos de prueba usan un nombre reconocible ("PRUEBA curl").
  - _Requisitos: REQ-1.2, REQ-1.3, REQ-1.4, REQ-2.5, REQ-5.2, REQ-5.3, REQ-6.1, REQ-6.2, REQ-6.3, REQ-7.1, REQ-7.2, REQ-7.3_

- [ ] D-4. Desplegar el portfolio y probar de punta a punta
  - Detalle: merge de las ramas F a la principal; el CI corre los tests, publica la imagen y `deploy.sh portfolio sha-…` la despliega. Probar `https://esceweb.com/#contact` en un navegador real, en escritorio y en el móvil.
  - Depende de: F-5, D-3
  - Verificación: envío real → mensaje de éxito y el mail llega; validación en cliente sin tocar la red (pestaña Network vacía); con la red desconectada en las herramientas del navegador → mensaje de error con el email y los valores conservados; cuarto envío en 10 minutos → mensaje de demasiados intentos; `https://catalog.esceweb.com` sigue funcionando; las demás secciones de la landing se ven igual.
  - _Requisitos: REQ-1.1, REQ-4.3, REQ-4.4, REQ-4.7, REQ-7.5, REQ-10.1, REQ-11.3, REQ-11.4_

- [ ] D-5. Cierre de la spec
  - Detalle: recorrer cada criterio de aceptación de `requirements.md` y completar la tabla "Verificación final" con sí/no y una línea de evidencia (test que pasó o verificación manual hecha). Eliminar los archivos `baseline-*.txt` si ya no hacen falta.
  - Depende de: D-4
  - Verificación: la tabla cubre REQ-1.1 a REQ-12.6 sin filas vacías; todo criterio en "no" tiene una tarea nueva o queda como pendiente declarado.
  - _Requisitos: todos_

---

## Cobertura de requisitos

| Requisito | Tareas |
|---|---|
| REQ-1 | B-3, B-5, B-6, F-4, D-3, D-4 |
| REQ-2 | B-4, B-7, D-3 |
| REQ-3 | F-3 |
| REQ-4 | F-2, F-3, F-4, D-4 |
| REQ-5 | B-4, B-5, F-3, D-3 |
| REQ-6 | B-2, B-6, B-7, D-3 |
| REQ-7 | B-7, W-1, D-1, D-3, D-4 |
| REQ-8 | B-5, B-6 |
| REQ-9 | B-1, B-3 (reutiliza `RESEND_API_KEY` y `MAIL_FROM`), B-5, B-6, W-1, D-1, D-2 |
| REQ-10 | F-1, D-4 |
| REQ-11 | B-0, B-2, B-3, B-6, B-8, F-0, F-5, D-2, D-4 |
| REQ-12 | B-0, B-3 a B-8, F-0, F-2 a F-5 |
| NFR-1 | B-8, F-5 |
| NFR-2, NFR-3, NFR-6 | F-3, F-5 |
| NFR-4, NFR-5 | B-6 |

---
**Estado:** Aprobado por el usuario — en implementación
