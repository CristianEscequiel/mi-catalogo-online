# Requisitos: contact-form

## Contexto y decisiones

**Origen del pedido.** Reemplazar la sección de contacto del portfolio (hoy solo muestra el email con un botón "Copiar") por un formulario con validación y feedback al enviar. El envío se hace con Resend.

**Repos involucrados** (los tres se leyeron en local antes de escribir esta spec):

| Repo | Ruta local | Rol en la feature |
|---|---|---|
| `mi-catalogo-online` | `C:\Programs\mi-catalogo-online` | Backend NestJS 11: nuevo módulo `contact`. Aloja esta spec. |
| `portfolio-web` | `C:\Programs\portfolio-web` (app en `portfolio/`) | Angular 20.3: formulario en `landing.html` / `landing.ts`. |
| `web-stack` | `C:\Programs\web-stack` | Compose y nginx de producción: pasa variables al contenedor y define `CORS_ORIGIN`. **Tercer repo afectado** que el pedido original no mencionaba; incluido por decisión del usuario. |

**Hecho verificado en el código (base de esta spec):**

- El backend ya tiene `MailService` con Resend (`backend/src/mail/mail.service.ts`). Lee `RESEND_API_KEY` y `MAIL_FROM`, y **lanza error al arrancar si falta la API key**. Hoy solo tiene `sendVerificationEmail` y `sendResetPasswordMail`; no existe ningún método genérico ni de contacto.
- `main.ts` aplica un `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`. Un campo no declarado en el DTO provoca 400.
- CORS: `app.enableCors({ origin })` con `CORS_ORIGIN` separado por comas. En producción (`web-stack/docker-compose.yml`) está fijo en `https://catalog.esceweb.com`; el portfolio (`https://esceweb.com`) hoy **sería rechazado**.
- La API solo se expone en `https://catalog.esceweb.com/api/` (nginx de `web-stack` quita el prefijo `/api`). `esceweb.com` solo sirve el portfolio estático.
- **No hay rate limiting**: `@nestjs/throttler` no está instalado ni hay guards globales.
- **No hay `trust proxy`** configurado. Detrás de nginx, `req.ip` sería la IP del contenedor nginx para todos los visitantes; un límite "por IP" no funcionaría sin corregirlo. El nginx ya envía `X-Forwarded-For`.
- El portfolio no tiene `HttpClient` ni `@angular/forms` en uso: `app.config.ts` solo provee router, y `landing.ts` no importa forms. `@angular/forms` está instalado. El CI del portfolio **sí bloquea** si los tests fallan (`ng test` sin `continue-on-error`).
- Los tests del backend están parcialmente rotos: Jest no resuelve imports `src/...` (no hay `moduleNameMapper`), y `mail.service.spec.ts` no provee `ConfigService`. El código nuevo debe poder testearse sin arreglar eso.

**Decisiones tomadas con el usuario:**

1. **Cross-origin:** el portfolio llama a `https://catalog.esceweb.com/api/contact`. No se toca el nginx de `esceweb.com`; se agregan `https://esceweb.com` y `https://www.esceweb.com` a `CORS_ORIGIN`.
2. **Remitente:** se reutiliza `MAIL_FROM`. Solo se agrega una variable nueva de destinatario.
3. **Rate limit inicial:** 3 envíos cada 10 minutos por IP.
4. **Arquitectura:** módulo `contact` dentro del backend existente, no microservicio. La comparación completa y la recomendación van en `design.md`.

## Fuera de alcance

- Microservicio separado para el formulario.
- Captcha (Turnstile, reCAPTCHA) u otra verificación humana más allá de honeypot y rate limiting.
- Guardar los mensajes en base de datos o panel para leerlos.
- Mail de confirmación o copia al visitante.
- Adjuntos y campos extra (asunto, teléfono, etc.).
- Internacionalización del formulario; los textos van en castellano.
- Arreglar los tests o el lint rotos existentes del backend.
- Cambios al flujo de autenticación del backend o a los mails de verificación y reseteo.

## REQ-1: Enviar un mensaje de contacto

**Historia de usuario:** Como visitante del portfolio, quiero enviar un mensaje desde la página, para contactar al autor sin abrir mi cliente de correo.

### Criterios de aceptación
1. CUANDO el visitante completa nombre, email y mensaje válidos y presiona "Enviar" EL SISTEMA DEBERÁ enviar `POST /contact` al backend con esos tres campos en formato JSON.
2. CUANDO el backend recibe una solicitud válida EL SISTEMA DEBERÁ enviar un mail con Resend al destinatario configurado en `CONTACT_TO_EMAIL`.
3. CUANDO el backend envía el mail EL SISTEMA DEBERÁ usar `MAIL_FROM` como remitente.
4. CUANDO el backend envía el mail EL SISTEMA DEBERÁ establecer el email del visitante como `reply-to`.
5. CUANDO el mail se envía correctamente EL SISTEMA DEBERÁ responder HTTP 201 con un cuerpo `{ "message": "..." }` que no incluya datos del visitante.
6. CUANDO el backend compone el mail EL SISTEMA DEBERÁ incluir en el cuerpo el nombre, el email y el mensaje del visitante.
7. CUANDO el backend compone el asunto del mail EL SISTEMA DEBERÁ construirlo con un prefijo fijo y el nombre del visitante sin saltos de línea.
8. CUANDO el backend compone el cuerpo HTML EL SISTEMA DEBERÁ escapar los caracteres HTML del nombre y del mensaje del visitante.

## REQ-2: Validación en el servidor

**Historia de usuario:** Como autor del portfolio, quiero que el servidor rechace datos inválidos, para no depender de que el cliente sea honesto.

### Criterios de aceptación
1. CUANDO el nombre está ausente, vacío (tras recortar espacios) o tiene menos de 2 o más de 80 caracteres EL SISTEMA DEBERÁ responder HTTP 400.
2. CUANDO el email no tiene formato válido o supera 254 caracteres EL SISTEMA DEBERÁ responder HTTP 400.
3. CUANDO el mensaje está ausente, vacío (tras recortar espacios) o tiene menos de 10 o más de 2000 caracteres EL SISTEMA DEBERÁ responder HTTP 400.
4. CUANDO el cuerpo contiene un campo distinto de `name`, `email`, `message` y `website` EL SISTEMA DEBERÁ responder HTTP 400.
5. CUANDO la respuesta es 400 EL SISTEMA DEBERÁ indicar qué campos fallaron sin exponer trazas ni detalles internos.
6. CUANDO la solicitud es inválida EL SISTEMA DEBERÁ no invocar a Resend.

## REQ-3: Validación en el formulario

**Historia de usuario:** Como visitante, quiero ver los errores de mi formulario antes de enviar, para corregirlos sin esperar al servidor.

### Criterios de aceptación
1. CUANDO el visitante sale de un campo con un valor que incumple las reglas de REQ-2 EL SISTEMA DEBERÁ mostrar un mensaje de error en castellano debajo de ese campo.
2. CUANDO el visitante presiona "Enviar" con algún campo inválido EL SISTEMA DEBERÁ no enviar la solicitud al backend.
3. CUANDO el visitante presiona "Enviar" con algún campo inválido EL SISTEMA DEBERÁ mover el foco al primer campo inválido.
4. CUANDO el visitante corrige un campo inválido EL SISTEMA DEBERÁ quitar el mensaje de error de ese campo.
5. CUANDO el formulario se renderiza EL SISTEMA DEBERÁ mostrar una etiqueta `<label>` visible asociada a cada campo.
6. CUANDO un campo es inválido y se muestra su error EL SISTEMA DEBERÁ marcarlo con `aria-invalid="true"` y asociar el mensaje con `aria-describedby`.
7. CUANDO el visitante escribe en el mensaje EL SISTEMA DEBERÁ mostrar la cantidad de caracteres usados sobre el máximo.

## REQ-4: Estados de envío y feedback

**Historia de usuario:** Como visitante, quiero saber qué pasó con mi envío, para no dudar si el mensaje llegó.

### Criterios de aceptación
1. CUANDO el visitante presiona "Enviar" con datos válidos EL SISTEMA DEBERÁ mostrar el estado "enviando" y deshabilitar el botón de envío hasta recibir respuesta.
2. CUANDO el estado es "enviando" EL SISTEMA DEBERÁ indicarlo con texto visible en el botón.
3. CUANDO el backend responde 201 EL SISTEMA DEBERÁ mostrar un mensaje de éxito y vaciar el formulario.
4. CUANDO el backend responde 429 EL SISTEMA DEBERÁ mostrar un mensaje que indique que se hicieron demasiados intentos y que se puede reintentar más tarde.
5. CUANDO el backend responde 400 e identifica los campos inválidos EL SISTEMA DEBERÁ mostrar el error debajo de cada campo indicado.
6. CUANDO el backend responde 400 sin identificar campos EL SISTEMA DEBERÁ mostrar un mensaje de error general.
7. CUANDO el backend responde 5xx o la solicitud falla por red o tiempo de espera EL SISTEMA DEBERÁ mostrar un mensaje de error general que incluya el email de contacto `esce.arguello21@gmail.com` como alternativa, y conservar lo que el visitante escribió.
8. CUANDO el formulario muestra éxito o error de envío EL SISTEMA DEBERÁ exponerlo en una región `aria-live` para lectores de pantalla.
9. CUANDO la solicitud supera 15 segundos sin respuesta EL SISTEMA DEBERÁ cancelarla y mostrar el mensaje de error general.
10. CUANDO el mensaje de error de envío se muestra EL SISTEMA DEBERÁ permitir reenviar sin recargar la página.
11. CUANDO el formulario está en estado inicial, enviando o con éxito EL SISTEMA DEBERÁ no mostrar el email de contacto ni el botón "Copiar".

## REQ-5: Protección anti-spam con honeypot

**Historia de usuario:** Como autor del portfolio, quiero filtrar bots simples, para no recibir spam automatizado.

### Criterios de aceptación
1. CUANDO el formulario se renderiza EL SISTEMA DEBERÁ incluir un campo `website` oculto para usuarios (fuera de pantalla, no navegable con teclado, `aria-hidden`, `autocomplete="off"`).
2. CUANDO el backend recibe `website` con cualquier valor no vacío EL SISTEMA DEBERÁ responder HTTP 201 con el mismo cuerpo que un envío real.
3. CUANDO el backend recibe `website` no vacío EL SISTEMA DEBERÁ no invocar a Resend.
4. CUANDO el backend recibe `website` no vacío EL SISTEMA DEBERÁ registrar un aviso en el log sin incluir el contenido del mensaje.

## REQ-6: Rate limiting por IP

**Historia de usuario:** Como autor del portfolio, quiero limitar la frecuencia de envíos, para evitar abuso y gasto de la cuota de Resend.

### Criterios de aceptación
1. CUANDO una misma IP envía más de 3 solicitudes a `POST /contact` en 10 minutos EL SISTEMA DEBERÁ responder HTTP 429 a las siguientes.
2. CUANDO el backend responde 429 EL SISTEMA DEBERÁ incluir la cabecera `Retry-After`.
3. CUANDO la solicitud llega a través del nginx de producción EL SISTEMA DEBERÁ identificar al visitante por la IP de `X-Forwarded-For`, no por la IP del contenedor nginx.
4. CUANDO el backend responde 429 EL SISTEMA DEBERÁ no invocar a Resend.
5. CUANDO el límite se aplica a `POST /contact` EL SISTEMA DEBERÁ no aplicarlo a ningún otro endpoint existente.
6. CUANDO la configuración no define valores propios EL SISTEMA DEBERÁ usar 3 solicitudes por 10 minutos como valores por defecto.

## REQ-7: CORS restringido al portfolio

**Historia de usuario:** Como autor del portfolio, quiero que solo mi sitio pueda llamar al endpoint desde un navegador, para reducir su uso desde otros orígenes.

### Criterios de aceptación
1. CUANDO un navegador solicita `POST /contact` desde `https://esceweb.com` EL SISTEMA DEBERÁ responder con `Access-Control-Allow-Origin` igual a ese origen.
2. CUANDO un navegador solicita `POST /contact` desde `https://www.esceweb.com` EL SISTEMA DEBERÁ responder con `Access-Control-Allow-Origin` igual a ese origen.
3. CUANDO un navegador solicita `POST /contact` desde un origen no listado EL SISTEMA DEBERÁ no devolver `Access-Control-Allow-Origin`.
4. CUANDO se configura `CORS_ORIGIN` de producción EL SISTEMA DEBERÁ incluir `https://catalog.esceweb.com`, `https://esceweb.com` y `https://www.esceweb.com`.
5. CUANDO un navegador solicita un endpoint existente desde `https://catalog.esceweb.com` tras el cambio EL SISTEMA DEBERÁ responder con `Access-Control-Allow-Origin` igual a ese origen.

## REQ-8: Falla de Resend

**Historia de usuario:** Como visitante, quiero recibir un error claro si el envío falla, para saber que debo reintentar.

### Criterios de aceptación
1. CUANDO Resend devuelve un error EL SISTEMA DEBERÁ responder HTTP 503 con un mensaje genérico en castellano.
2. CUANDO Resend lanza una excepción o no responde EL SISTEMA DEBERÁ responder HTTP 503 con el mismo mensaje genérico.
3. CUANDO la respuesta es 503 EL SISTEMA DEBERÁ no incluir en el cuerpo el error de Resend, trazas, claves ni direcciones.
4. CUANDO Resend falla EL SISTEMA DEBERÁ registrar el error completo en el log del servidor sin incluir el contenido del mensaje del visitante.
5. CUANDO la llamada a Resend supera 10 segundos EL SISTEMA DEBERÁ considerarla fallida y responder 503.

## REQ-9: Configuración por variables de entorno

**Historia de usuario:** Como operador, quiero configurar el destino y los límites por entorno, para no tocar código al cambiar valores.

### Criterios de aceptación
1. CUANDO el backend arranca EL SISTEMA DEBERÁ leer el destinatario desde `CONTACT_TO_EMAIL`.
2. CUANDO `CONTACT_TO_EMAIL` está ausente o no es un email válido EL SISTEMA DEBERÁ fallar al arrancar con un mensaje que nombre la variable.
3. CUANDO el backend arranca EL SISTEMA DEBERÁ leer `RESEND_API_KEY` y `MAIL_FROM` con el mecanismo existente.
4. CUANDO el backend arranca EL SISTEMA DEBERÁ leer los límites de rate limiting desde `CONTACT_RATE_LIMIT` (cantidad) y `CONTACT_RATE_TTL_SECONDS` (ventana), con 3 y 600 por defecto.
5. CUANDO se agrega una variable nueva EL SISTEMA DEBERÁ documentarla en `backend/.env-example`, en `Env` (`backend/src/env.model.ts`) y en `web-stack/.env.example`.
6. CUANDO se despliega en producción EL SISTEMA DEBERÁ pasar `CONTACT_TO_EMAIL` y las variables de límite al contenedor `catalog_backend` desde `web-stack/docker-compose.yml`.
7. CUANDO se versiona el código EL SISTEMA DEBERÁ no contener valores reales de claves, remitentes ni destinatarios.

## REQ-10: URL de la API en el portfolio

**Historia de usuario:** Como autor del portfolio, quiero que la URL de la API sea configurable por entorno, para probar en local sin tocar producción.

### Criterios de aceptación
1. CUANDO se compila el portfolio para producción EL SISTEMA DEBERÁ apuntar a `https://catalog.esceweb.com/api`.
2. CUANDO se ejecuta el portfolio en desarrollo EL SISTEMA DEBERÁ apuntar a una URL local configurable del backend.
3. CUANDO el código del formulario construye la solicitud EL SISTEMA DEBERÁ tomar la base de la URL de la configuración y no de un literal en el componente.

## REQ-11: Convivencia con funcionalidad existente

**Historia de usuario:** Como autor, quiero que agregar el formulario no rompa lo que ya funciona, para no introducir regresiones.

### Criterios de aceptación
1. CUANDO se despliega el módulo `contact` EL SISTEMA DEBERÁ mantener sin cambios el comportamiento de los endpoints de `auth`.
2. CUANDO se activa la configuración de proxy de confianza EL SISTEMA DEBERÁ mantener los códigos de respuesta de `POST /auth/login` y `POST /auth/register` ante las mismas entradas.
3. CUANDO se despliega el portfolio EL SISTEMA DEBERÁ conservar las demás secciones de la landing sin cambios (hero, proyectos, stack, footer, enlaces `#contact`).
4. CUANDO se reemplaza la sección de contacto EL SISTEMA DEBERÁ mantener el ancla `id="contact"` y el título de la sección.
5. CUANDO los tests del portfolio se ejecutan en CI EL SISTEMA DEBERÁ pasar sin romper el job `build`.

## REQ-12: Pruebas

**Historia de usuario:** Como autor, quiero tests automáticos de lo nuevo, para detectar regresiones.

### Criterios de aceptación
1. CUANDO se ejecuta la suite del backend EL SISTEMA DEBERÁ incluir tests del servicio de contacto que cubran envío correcto, error de Resend y excepción de Resend, con Resend mockeado.
2. CUANDO se ejecuta la suite del backend EL SISTEMA DEBERÁ incluir tests del controller que cubran honeypot, DTO inválido, éxito y 503.
3. CUANDO se ejecuta la suite del backend EL SISTEMA DEBERÁ incluir un test del límite de frecuencia que compruebe el 429 en la solicitud número 4.
4. CUANDO se ejecutan los tests nuevos del backend EL SISTEMA DEBERÁ pasar sin depender de que los tests existentes rotos se arreglen.
5. CUANDO se ejecuta la suite del portfolio (Karma/Jasmine) EL SISTEMA DEBERÁ incluir tests del formulario que cubran validación, estado "enviando", éxito, error 429, error 5xx y honeypot, con el HTTP mockeado.
6. CUANDO se ejecutan `npm run build` en `backend/` y `npm run build -- --configuration production` en `portfolio/` EL SISTEMA DEBERÁ compilar sin errores.

## Requisitos no funcionales

- NFR-1: El código nuevo respeta Prettier y ESLint de cada repo (backend: comillas simples y `trailingComma: all`; portfolio: `printWidth: 100`, comillas simples, indentación de 2 espacios).
- NFR-2: El formulario se puede completar y enviar solo con teclado, y el botón de envío tiene el foco visible.
- NFR-3: El formulario no tiene desbordamiento horizontal en ancho de 320 px.
- NFR-4: El módulo `contact` no importa nada de `auth`, `users` ni de las entidades de base de datos.
- NFR-5: El código nuevo del backend usa imports relativos para poder ejecutarse en Jest sin `moduleNameMapper`.
- NFR-6: El formulario respeta los temas `business` y `corporate` de DaisyUI ya existentes en la landing.

## Preguntas abiertas

Ninguna. Resueltas por el usuario al aprobar esta spec:

1. **Email visible:** se quita el email con su botón "Copiar" del flujo normal y se muestra solo dentro del mensaje de error de envío (5xx, red o tiempo de espera). Refleja REQ-4.7 y REQ-4.11.
2. **Remitente:** `MAIL_FROM` ya envía correctamente desde producción (confirmado por el usuario; no verificable desde el código).
3. **Destinatario:** `CONTACT_TO_EMAIL` es `esce.arguello21@gmail.com`.
4. **Ruta:** `POST /contact`, expuesta en producción como `https://catalog.esceweb.com/api/contact`.

## Verificación final

Se completa al cerrar la spec, después de terminar `tasks.md`.

| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| REQ-1.1 a REQ-12.6 | | |

---
**Estado:** Aprobado por el usuario
