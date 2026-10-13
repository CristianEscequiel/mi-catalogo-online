# Requisitos: backend-architecture

Segunda de tres specs de la Fase 3 (arquitectura y calidad). Viene después de `quality-baseline`, que dejó tests, lint y CI en verde: esta spec es un refactor **sin cambios de comportamiento**, y esa red de seguridad es lo que permite hacerlo.

## 1. Contexto y decisiones

**De dónde sale:** la auditoría del 2026-10-12 marcó dos problemas de acoplamiento en el backend:
1. Cada controller extrae el usuario autenticado a mano (`@Request() req` y `req.user as Payload`), con tres formas distintas de tipar el request. `quality-baseline` lo contuvo con la interfaz `AuthenticatedRequest`, a propósito como paso intermedio.
2. Los servicios de dominio dependen de clases concretas que envuelven un proveedor externo: `MailService` (Resend), `OpenaiService` (OpenAI) y `FileStorageService` (disco local). Las pruebas de quien los consume tienen que conocer ese detalle, y cambiar de proveedor obliga a tocar a los consumidores.

**Estado medido el 2026-10-13 (`main` en `e30b42a`):**

| Tema | Hoy |
|---|---|
| Lectura de `req.user` | 6 controllers (`auth`, `cart`, `favorites`, `orders`, `product`, `category`) con `@Request()`; en `product` y `category` conviven tres formas: `req` sin tipo, `req: { user: Payload }` y `req.user as Payload`. `auth.controller` usa `req: { user: User }`, que es otra cosa: el usuario que deja la estrategia `local` al hacer login. |
| Correo | `AuthService` y `ContactService` inyectan `MailService` (métodos usados: `sendVerificationEmail`, `sendResetPasswordMail`, `sendContactMessage`). `MailController` está vacío. |
| Archivos | `UsersService`, `ProductService` y `CategoryService` inyectan `FileStorageService` (métodos usados: `buildPublicPath` y `deleteByPublicPath`). La subida en sí la hace Multer en la capa HTTP (`createImageMulterOptions`), no este servicio. |
| IA | `ProductController` inyecta `OpenaiService` (métodos usados: `generateProductContent` y `generateProductFromImage`). |
| Hash de contraseña | **No se filtra**: `User.password` tiene `@Exclude()` y `app.setup.ts` aplica `ClassSerializerInterceptor`; lo prueba `auth-dto.security.spec.ts`. La nota de `pendientes.md` que decía lo contrario era un error y se corrige en esta spec. |

**Decisiones tomadas (con el usuario, 2026-10-13):**
- Alcance **decorador + puertos**. Quedan para specs posteriores: DTOs/presenters de respuesta, repositorios por contexto y mover reglas al dominio.

**Decisiones de diseño de la spec (a confirmar al aprobar):**
- `@CurrentUser()` reemplaza a `AuthenticatedRequest`: la interfaz se elimina cuando deja de usarse.
- Cada puerto tiene **un solo adaptador**, el que ya existe. No se agregan proveedores nuevos (S3, otro mail, otro modelo): son Fase 4.
- Los adaptadores conservan su comportamiento y sus validaciones de arranque (falta una API key → el constructor lanza, como hoy).
- La subida de archivos con Multer queda como está: es HTTP, no almacenamiento de dominio. El puerto cubre solo lo que los servicios usan hoy.

**Fuera de alcance:**
- DTOs de respuesta, presenters, repositorios por contexto, reglas de dominio (`backend-architecture` 2.ª etapa, a definir).
- Cualquier cambio de la API pública (rutas, códigos de estado, cuerpos de respuesta).
- Proveedores alternativos y almacenamiento en la nube.
- El login por estrategia `local` (`auth.controller.login` seguirá leyendo el `User` que deja Passport).
- Borrar `MailController` (vacío): se anota, no se toca.
- Cambios de esquema de base de datos y dependencias nuevas.

## 2. Requisitos

### REQ-1: Decorador `@CurrentUser()`

- **REQ-1.1** CUANDO un handler declare un parámetro con `@CurrentUser()`, EL SISTEMA DEBERÁ inyectarle el `Payload` (`{ sub, role }`) que dejó el guard JWT en el request.
- **REQ-1.2** CUANDO se use `@CurrentUser()`, EL SISTEMA DEBERÁ tiparlo como `Payload`, sin `any` ni conversiones `as Payload` en el controller.
- **REQ-1.3** CUANDO el request llegue sin usuario (ruta sin guard de autenticación), EL SISTEMA DEBERÁ entregar `undefined` y no lanzar: autenticar sigue siendo trabajo del guard.
- **REQ-1.4** CUANDO `cart`, `favorites`, `orders`, `product` y `category` necesiten al usuario autenticado, EL SISTEMA DEBERÁ obtenerlo con `@CurrentUser()` y no con `@Request()`.
- **REQ-1.5** CUANDO `product.controller` y `category.controller` hoy lean `req.user` de tres maneras distintas, EL SISTEMA DEBERÁ unificarlas en `@CurrentUser()` conservando las reglas de rol que ya aplican (por ejemplo, quién puede crear con rol `GUEST`).
- **REQ-1.6** CUANDO `RolesGuard` y `SelfOrAdminGuard` lean el usuario del contexto de ejecución, EL SISTEMA DEBERÁ hacerlo sin `any` y sin depender de `AuthenticatedRequest`.
- **REQ-1.7** CUANDO ya no quede ningún uso de `AuthenticatedRequest`, EL SISTEMA DEBERÁ eliminar esa interfaz.
- **REQ-1.8** CUANDO se pida una ruta protegida sin token o con un token inválido, EL SISTEMA DEBERÁ seguir respondiendo 401, igual que hoy.

### REQ-2: Puertos para el correo, los archivos y la IA

- **REQ-2.1** CUANDO `AuthService` y `ContactService` necesiten enviar un correo, EL SISTEMA DEBERÁ depender de un puerto `MailSender` con `sendVerificationEmail`, `sendResetPasswordMail` y `sendContactMessage`, y no de la clase `MailService`.
- **REQ-2.2** CUANDO `UsersService`, `ProductService` y `CategoryService` necesiten una ruta pública de imagen o borrar una imagen, EL SISTEMA DEBERÁ depender de un puerto `ImageStorage` con `buildPublicPath` y `deleteByPublicPath`, y no de la clase `FileStorageService`.
- **REQ-2.3** CUANDO `ProductController` necesite contenido generado por IA, EL SISTEMA DEBERÁ depender de un puerto `AiContentGenerator` con `generateProductContent` y `generateProductFromImage`, y no de la clase `OpenaiService`.
- **REQ-2.4** CUANDO se arme el módulo de Nest, EL SISTEMA DEBERÁ vincular cada puerto con su único adaptador existente (`MailService`, `FileStorageService`, `OpenaiService`).
- **REQ-2.5** CUANDO un consumidor (`AuthService`, `ContactService`, `UsersService`, `ProductService`, `CategoryService`, `ProductController`) se pruebe, EL SISTEMA DEBERÁ permitir reemplazar el puerto por un doble de prueba sin `jest.mock('resend')` ni `jest.mock('openai')`.
- **REQ-2.6** CUANDO se revisen los imports de los consumidores, EL SISTEMA DEBERÁ no encontrar ninguno que apunte a `mail.service`, `file-storage.service` ni `openai.service`; esos archivos solo se importan desde su propio módulo y desde sus specs.
- **REQ-2.7** CUANDO el adaptador de correo, el de archivos o el de IA se ejecuten, EL SISTEMA DEBERÁ comportarse exactamente como hoy: mismos mensajes, mismas excepciones (`InternalServerErrorException` al fallar un envío, `BadGatewayException` y `BadRequestException` de la IA) y mismo borrado silencioso de archivos inexistentes.
- **REQ-2.8** CUANDO falte `RESEND_API_KEY` u `OPENAI_API_KEY`, EL SISTEMA DEBERÁ seguir negándose a arrancar con el mismo error, ya sea por `validateEnv` o por el constructor del adaptador.
- **REQ-2.9** CUANDO el flujo de contacto envíe el mensaje, EL SISTEMA DEBERÁ conservar el tiempo máximo de 10 segundos y la respuesta 503 con el mensaje de falla actual si el envío falla o se pasa de tiempo.

### REQ-3: Sin cambios de comportamiento

- **REQ-3.1** CUANDO se ejecute `npm test` en `backend/`, EL SISTEMA DEBERÁ terminar con 0 suites fallidas y no tener menos pruebas que las 308 actuales, salvo las que se reemplacen por equivalentes con el mismo objetivo (y quede anotado cuáles).
- **REQ-3.2** CUANDO se ejecuten las suites e2e en serie contra una base descartable, EL SISTEMA DEBERÁ dar el mismo resultado que hoy (10 de 11 suites; la que falla es `app.e2e-spec.ts`, preexistente).
- **REQ-3.3** CUANDO se compare la API antes y después, EL SISTEMA DEBERÁ mantener rutas, métodos, códigos de estado y cuerpos de respuesta. Verificable con las e2e y con el documento de Swagger generado en desarrollo (mismo `paths`).
- **REQ-3.4** CUANDO se ejecuten `npx eslint "{src,apps,libs,test}/**/*.ts"` y `npm run build`, EL SISTEMA DEBERÁ terminar con código 0.
- **REQ-3.5** CUANDO termine la spec, EL SISTEMA DEBERÁ no haber agregado dependencias a `package.json`, ni migraciones, ni variables de entorno nuevas.
- **REQ-3.6** CUANDO se construya la imagen del backend, EL SISTEMA DEBERÁ seguir corriendo como usuario no root y arrancar con `/health` en 200 en la pila local.

### REQ-4: Pruebas de lo nuevo

- **REQ-4.1** CUANDO se agregue `@CurrentUser()`, EL SISTEMA DEBERÁ tener pruebas unitarias del caso con usuario y del caso sin usuario.
- **REQ-4.2** CUANDO cada controller pase a `@CurrentUser()`, EL SISTEMA DEBERÁ tener al menos una prueba por controller que confirme que el servicio recibe el `sub` y el `role` del usuario autenticado, no del body ni de la URL.
- **REQ-4.3** CUANDO un consumidor dependa de un puerto, EL SISTEMA DEBERÁ tener su spec armado con un doble del puerto (no del adaptador) y probando que invoca al puerto con los argumentos correctos.

### REQ-5: Documentación

- **REQ-5.1** CUANDO termine la spec, EL SISTEMA DEBERÁ actualizar `steering/structure.md` con la convención de puertos (dónde viven, cómo se vincula el adaptador, cómo se prueba) y con el uso de `@CurrentUser()`.
- **REQ-5.2** CUANDO se cierre la spec, EL SISTEMA DEBERÁ corregir en `specs/pendientes.md` la nota que afirma que `UsersService` devuelve el hash de la contraseña, y la de `quality-baseline` que la repite.
- **REQ-5.3** CUANDO se cierre la spec, EL SISTEMA DEBERÁ dejar en `specs/pendientes.md` lo que sigue abierto de la Fase 3 backend (DTOs de respuesta, repositorios por contexto, reglas de dominio).

## 3. Auto-revisión

- **¿Requisitos mezclados?** REQ-1.5 junta "unificar las tres formas" con "conservar las reglas de rol": son la misma tarea vista desde el resultado, pero se verifica por separado (REQ-4.2 y e2e de permisos). REQ-2.7 enumera tres adaptadores en uno; se verifica con los specs existentes de cada adaptador (`mail.service*.spec.ts`, `openai.service.spec.ts`; el de archivos se cubre por los consumidores). Si preferís requisitos separados por adaptador, se parten.
- **¿Palabras no verificables?** "Exactamente como hoy" (REQ-2.7) se ancla a excepciones y mensajes concretos y a que los specs de los adaptadores sigan en verde sin modificarse. "Sin cambios de comportamiento" (REQ-3.3) se ancla a las e2e y al `paths` de Swagger. REQ-2.6 es verificable con un `grep`.
- **¿Falta algún camino no feliz?** Cubiertos: sin usuario (REQ-1.3), sin token (REQ-1.8), falla del proveedor (REQ-2.7, 2.9), configuración ausente (REQ-2.8). Riesgo sin requisito propio: un puerto mal vinculado en el módulo rompería el arranque de Nest, no un test unitario; lo cubren las e2e, que arrancan los módulos reales, y el humo de la pila local (REQ-3.6).
- **Limitación conocida:** no se puede probar que la interfaz del puerto sea "buena": solo que la usan los consumidores y que cambiar el adaptador en un test no obliga a tocar al consumidor.
