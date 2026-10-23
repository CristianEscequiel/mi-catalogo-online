# Requisitos: ia-al-crear-producto

Permite usar «Analizar imagen con IA» al **crear** un producto, antes de guardarlo. Hoy el botón queda deshabilitado hasta que el producto existe y tiene la imagen subida.

Estado: **aprobada por el usuario el 2026-10-22** (v2; la v1 fue revisada por `spec-reviewer`: 3 bloqueantes y 6 menores, todos incorporados). El usuario aprobó también la regla de REQ-2.14 (las peticiones rechazadas por validación consumen tope de IA) y dejó pre-aprobadas las fases siguientes (diseño, tareas e implementación) para correrlas de corrido.

## 1. Contexto y decisiones

**Origen:** hallazgo de la prueba local del 2026-10-22 (ver `pendientes.md`, «Hallazgos de la prueba local»). El usuario quiere usar el autocompletado con IA mientras crea el producto, no después de guardarlo y editarlo. Es el abierto «Análisis con IA antes de guardar el producto» que dejó `profile-and-images`.

**Estado medido el 2026-10-22 (`main` en `c84fc73`):**

| Tema | Hoy |
|---|---|
| Botón «Analizar imagen con IA» | `product-form.component.ts:152` (`canAnalyzeImageWithAi`) exige `resolvedImageUrl()`, es decir, una imagen **ya subida** al servidor. En modo `create` solo existe un `File` local (vista previa), así que el botón queda deshabilitado. |
| Dónde vive el archivo elegido | `PrdFormComponent` solo **reemite** el `File` (`onImageFileSelected` → `imageFileSelected`); quien lo guarda es el diálogo padre (`ProductFormDialogComponent.selectedImageFile`). Para analizarlo, el formulario necesita tener el archivo: es una decisión de diseño que condiciona REQ-1.3 y REQ-1.16. |
| Categorías | `PrdFormComponent` las carga al iniciar (`loadingCategories`, `categories`); mientras cargan, la lista está vacía. |
| Botón «Generar descripción y slug» | Usa solo el nombre (`GET /products/generate-ai/:name`). Ya funciona al crear; no cambia. |
| Endpoint de análisis | `POST /products/generate-from-image` recibe `{ imageUrl, categories }` y le pasa `imageUrl` tal cual a OpenAI (`openai.service.ts`, `input_image.image_url`). Con una URL de `localhost` OpenAI no puede descargar la imagen: en desarrollo local el análisis fallaría aunque el botón estuviera habilitado. Está protegido por `JWT` + `RolesGuard('ADMIN','GUEST')` + `AiThrottlerGuard` (un contador por usuario compartido con `generate-ai`; el guard corre **antes** de la validación del cuerpo). |
| Subida de imágenes | `multer` con `diskStorage`, filtro `image/jpeg`, `image/png`, `image/webp` y tope `MAX_IMAGE_SIZE_BYTES` (5 MB por defecto), en `files/multer-image-options.factory.ts`. El frontend valida lo mismo en `shared/utils/image-rules.ts`. |
| Aplicar sugerencias | `applyImageSuggestions` completa los campos vacíos y pide confirmación antes de pisar uno con contenido. Se reutiliza tal cual. |
| Errores del proveedor | `generateProductFromImage` ya lanza 502 `OpenAI request failed`, 400 `Invalid AI response format` y 400 si la IA no devuelve nombre (`openai.service.ts`). |

**Decisiones tomadas (con el usuario, 2026-10-22):**
- **Enviar el archivo directo:** un endpoint nuevo recibe la imagen por `multipart/form-data`, la analiza **en memoria** y no la guarda. Se descartó la carpeta temporal con limpieza de huérfanos: agrega estado en disco y no resolvería `localhost`.
- **Alcance: solo el alta de producto.** La edición sigue usando la URL de la imagen ya subida y el endpoint actual.

**Decisiones de la spec (a confirmar al aprobar):**
- El archivo analizado y el que se sube al guardar son **el mismo archivo elegido**; analizar no sube nada. Al guardar, la subida sigue siendo la de hoy (después de crear el producto, con el manejo de fallos de `profile-and-images`).
- **Contador de IA:** el endpoint nuevo reutiliza `AiThrottlerGuard`, que corre antes de la validación. Por eso una petición rechazada por archivo o `categories` inválidos (400, 413, 415) **también consume tope**; las rechazadas por 401 o 403 no, porque los guards de autenticación y rol corren antes (REQ-2.14). Es el comportamiento que ya tiene `generate-from-image`; hacer que no consuman exigiría un diseño distinto y no se pide.
- **Formato de `categories` en el `multipart`:** un campo de texto con un JSON, por ejemplo `[{"id":1,"name":"Teclados"}]`.
- El endpoint actual `POST /products/generate-from-image` **no cambia** (sigue siendo el de la edición).
- El puerto `AiContentGenerator` no cambia: el backend convierte el archivo a un `data:` URL (con una función pura, ver `design.md`) y llama al método existente `generateProductFromImage`.

**Fuera de alcance:**
- Cambiar la edición del producto, el botón «Generar descripción y slug» o el endpoint `generate-from-image` actual.
- Endurecer el endpoint actual contra SSRF o prompt injection (pendiente aparte en `pendientes.md`).
- Subida previa a carpeta temporal, varias imágenes por producto, validar *magic bytes*.
- Análisis con IA para categorías.
- Dependencias nuevas, migraciones, variables de entorno nuevas.
- Cambiar `ImageFieldComponent` (no emite `null` al rechazar un archivo; se conserva ese comportamiento).
- **Límite conocido (auditoría, M3):** en modo `edit` con una imagen ya subida y un archivo local nuevo elegido y aún sin subir, se analiza la imagen subida (REQ-1.17), no el archivo local. En edición, elegir un archivo lo sube enseguida y reemplaza la URL, así que es un estado transitorio; solo persiste si el usuario rechaza el reemplazo. No se cambia aquí.

## 2. Requisitos

Convención: un comportamiento por criterio.

### REQ-1: Habilitar el análisis de imagen al crear (frontend)

**Historia de usuario:** Como administrador, quiero analizar con IA la imagen que acabo de elegir mientras creo el producto, para completar nombre, descripción, categoría y slug sin guardarlo antes.

- **REQ-1.1** CUANDO el formulario está en modo `create` y el usuario elige una imagen que pasa las reglas de `image-rules.ts`, EL SISTEMA DEBERÁ habilitar «Analizar imagen con IA».
- **REQ-1.2** SI el formulario está en modo `create` y no hay una imagen elegida, ENTONCES EL SISTEMA DEBERÁ mostrar «Analizar imagen con IA» deshabilitado.
- **REQ-1.3** CUANDO el usuario quita la imagen elegida, EL SISTEMA DEBERÁ volver a deshabilitar «Analizar imagen con IA».
- **REQ-1.3a** CUANDO el usuario elige un archivo rechazado por `image-rules.ts` teniendo ya uno válido elegido, EL SISTEMA DEBERÁ conservar el archivo válido anterior (el que sigue mostrando la vista previa) como la imagen a analizar. *(Enmienda del 2026-10-22, tras la revisión del diseño: `ImageFieldComponent` no emite `null` al rechazar, solo al quitar; así la imagen analizada es siempre la que se ve.)*
- **REQ-1.4** CUANDO el usuario pulsa «Analizar imagen con IA» en modo `create`, EL SISTEMA DEBERÁ enviar la imagen elegida y las categorías disponibles al endpoint nuevo de REQ-2.
- **REQ-1.5** CUANDO el usuario pulsa «Analizar imagen con IA» en modo `create`, EL SISTEMA DEBERÁ no crear el producto ni subir la imagen al almacenamiento.
- **REQ-1.6** MIENTRAS el análisis está en curso, EL SISTEMA DEBERÁ mostrar «Analizar imagen con IA» deshabilitado con el texto «Analizando imagen...».
- **REQ-1.7** MIENTRAS el análisis está en curso, EL SISTEMA DEBERÁ mostrar «Generar descripción y slug» deshabilitado.
- **REQ-1.8** MIENTRAS el análisis está en curso, EL SISTEMA DEBERÁ mostrar el botón de guardar deshabilitado.
- **REQ-1.9** CUANDO el análisis responde con una sugerencia para un campo vacío, EL SISTEMA DEBERÁ completar ese campo.
- **REQ-1.10** CUANDO el análisis responde con una sugerencia para un campo que ya tiene un valor distinto, EL SISTEMA DEBERÁ pedir confirmación antes de reemplazarlo.
- **REQ-1.11** CUANDO el análisis falla, EL SISTEMA DEBERÁ mostrar el aviso «No se pudo analizar la imagen con IA.».
- **REQ-1.12** CUANDO el análisis falla, EL SISTEMA DEBERÁ dejar los campos del formulario y la imagen elegida como estaban.
- **REQ-1.13** CUANDO el análisis falla, EL SISTEMA DEBERÁ volver a habilitar «Analizar imagen con IA».
- **REQ-1.14** SI las categorías ya se cargaron y la lista está vacía, ENTONCES EL SISTEMA DEBERÁ mostrar «No hay categorías disponibles para sugerir una coincidencia.» al pulsar el botón, sin llamar al backend.
- **REQ-1.15** MIENTRAS las categorías se están cargando, EL SISTEMA DEBERÁ mostrar «Analizar imagen con IA» deshabilitado.
- **REQ-1.16** CUANDO el usuario guarda el producto después de analizar, EL SISTEMA DEBERÁ crearlo y subir la imagen elegida una sola vez, igual que hoy.
- **REQ-1.17** CUANDO el formulario está en modo `edit` y el producto ya tiene una imagen subida, EL SISTEMA DEBERÁ seguir analizando esa imagen con `POST /products/generate-from-image`, sin cambios de comportamiento (salvo el bloqueo durante la carga de categorías de REQ-1.15).
- **REQ-1.18** CUANDO el formulario pasó a modo `edit` porque la imagen no se pudo subir tras crear el producto (no hay imagen subida pero sí el archivo local elegido), EL SISTEMA DEBERÁ analizar ese archivo local con el endpoint nuevo. *(Enmienda del 2026-10-22, tras la revisión del diseño.)*
- **REQ-1.20** CUANDO el formulario se destruye mientras el análisis está en curso, EL SISTEMA DEBERÁ no aplicar sugerencias ni mostrar avisos cuando la respuesta llegue. *(Enmienda del 2026-10-22, por la auditoría de código.)*
- **REQ-1.19** CUANDO falla la carga de categorías, EL SISTEMA DEBERÁ dejar de considerarlas «en carga» y mostrar «No hay categorías disponibles para sugerir una coincidencia.» al pulsar el botón. *(Enmienda del 2026-10-22: sin esto el botón quedaría deshabilitado para siempre.)*

### REQ-2: Endpoint de análisis con archivo (backend)

**Historia de usuario:** Como administrador, quiero que el backend analice la imagen que le envío sin guardarla, para sugerir los datos del producto antes de crearlo.

La petición es `multipart/form-data` con el archivo en el campo `file` y `categories` como campo de texto con un JSON `[{ "id": <entero ≥ 1>, "name": <texto no vacío> }]`.

- **REQ-2.1** CUANDO un `ADMIN` o `GUEST` autenticado envía un `file` de tipo `image/jpeg`, `image/png` o `image/webp` y un `categories` válido, EL SISTEMA DEBERÁ responder 201 con `{ name, description, categoryId, categoryName, slug }`, la misma forma que `POST /products/generate-from-image`.
- **REQ-2.2** CUANDO se pide el endpoint sin token o con un token inválido, EL SISTEMA DEBERÁ responder 401.
- **REQ-2.3** CUANDO lo pide un usuario con rol `CLIENT`, EL SISTEMA DEBERÁ responder 403.
- **REQ-2.4** CUANDO el archivo no es `image/jpeg`, `image/png` ni `image/webp`, EL SISTEMA DEBERÁ responder 415 sin llamar al proveedor de IA.
- **REQ-2.5** CUANDO el archivo supera `MAX_IMAGE_SIZE_BYTES`, EL SISTEMA DEBERÁ responder 413 sin llamar al proveedor de IA.
- **REQ-2.6** CUANDO la petición no trae el archivo `file`, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA.
- **REQ-2.7** CUANDO el archivo `file` está vacío (0 bytes), EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA.
- **REQ-2.8** CUANDO `categories` falta o es una lista vacía, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA.
- **REQ-2.9** CUANDO `categories` no es un JSON que se pueda interpretar, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA.
- **REQ-2.10** CUANDO `categories` es un JSON que no es una lista de `{ id, name }` con `id` entero ≥ 1 y `name` texto no vacío, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA.
- **REQ-2.11** CUANDO el endpoint atiende una petición, EL SISTEMA DEBERÁ no escribir ningún archivo en `uploads/`.
- **REQ-2.12** CUANDO el usuario ya agotó el tope de llamadas de IA, EL SISTEMA DEBERÁ responder 429.
- **REQ-2.13** CUANDO el usuario usa este endpoint, `generate-ai` o `generate-from-image`, EL SISTEMA DEBERÁ sumar las tres en el mismo contador de IA por usuario.
- **REQ-2.14** CUANDO la petición es rechazada con 400, 413 o 415 por el archivo o por `categories`, EL SISTEMA DEBERÁ contarla en el tope de IA; las rechazadas con 401 o 403 no deben contarse.
- **REQ-2.15** CUANDO el proveedor de IA falla, EL SISTEMA DEBERÁ responder 502 con el mensaje `OpenAI request failed`, igual que `generate-from-image`.
- **REQ-2.16** CUANDO la respuesta de la IA no es un JSON válido o no trae nombre, EL SISTEMA DEBERÁ responder 400, igual que `generate-from-image`.
- **REQ-2.17** CUANDO el endpoint llama al proveedor, EL SISTEMA DEBERÁ pasarle la imagen como `data:` URL (`data:<mime>;base64,<contenido>`) por el método existente `generateProductFromImage` del puerto `AiContentGenerator`, sin cambiar el puerto.

- **REQ-2.18** CUANDO `categories` tiene más de 200 elementos, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA. *(Enmienda del 2026-10-22, por la auditoría de código: acota el prompt que se envía a OpenAI.)*
- **REQ-2.19** CUANDO la petición trae más de un archivo, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA. *(Enmienda del 2026-10-22, por la auditoría.)*
- **REQ-2.20** CUANDO la petición trae más de un campo de texto, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA. *(Enmienda del 2026-10-22, por la auditoría.)*
- **REQ-2.21** CUANDO un campo de texto supera los 64 KB, EL SISTEMA DEBERÁ responder 400 sin llamar al proveedor de IA. *(Enmienda del 2026-10-22, por la auditoría.)*

## 3. Requisitos no funcionales

- **NFR-1** EL SISTEMA DEBERÁ mantener sin cambios el contrato de `POST /products/generate-from-image` y de `GET /products/generate-ai/:name`. Se verifica comparando esas dos entradas del documento `/swagger/json` (desarrollo) antes y después, y con los specs de controller existentes en verde.
- **NFR-2** EL SISTEMA DEBERÁ terminar con estos comandos en verde, sin modificar tests existentes para que pasen: en `backend/`, `npm test`, `npx eslint "{src,apps,libs,test}/**/*.ts"` y `npm run build`; en `frontend/`, `npm run lint`, `npx ng test --no-watch --browsers=ChromeHeadless` y `npm run build`.
- **NFR-3** EL SISTEMA DEBERÁ no agregar dependencias a los `package.json`, ni migraciones, ni variables de entorno (`multer` ya está instalado).
- **NFR-4** EL SISTEMA DEBERÁ documentar el endpoint nuevo en Swagger (`@ApiConsumes('multipart/form-data')` y esquema del cuerpo).
- **NFR-5** EL SISTEMA DEBERÁ mantener `OnPush` y el estado nuevo del frontend en signals.
- **NFR-6** EL SISTEMA DEBERÁ no superar los 800 kB del bundle inicial del frontend (`maximumWarning` de `angular.json`; el error del build está en 1 MB).

## 4. Preguntas abiertas

- **Ruta y nombre del endpoint** (por ejemplo `POST /products/generate-from-image/upload` o `POST /products/analyze-image`): se decide en el diseño. El único riesgo real de choque es con rutas `POST products/:id/...` de dos segmentos (por ejemplo `:id/image`); una ruta `POST` de un solo segmento no choca con ellas.
- **Dónde guarda el `File` el formulario** (REQ-1.3, REQ-1.16): se decide en el diseño.
- **Privacidad:** la imagen viaja a OpenAI igual que hoy en `generate-from-image`; el diseño no agrega almacenamiento ni registro del contenido.

## 5. Verificación final

Verificación de `spec-verifier` (2026-10-22), con los comandos corridos desde `backend/` y `frontend/`: backend `npm test` 44 suites y **421 tests** en verde (línea base 344), eslint sin salida, `npm run build` ok; frontend `npm run lint` ok, Karma **336 de 336** (línea base 310), `npm run build` ok con bundle inicial **764,54 kB** (límite 800 kB). Sin `.skip`, `fit`, `xit` ni aserciones débiles de severidad alta. Los specs existentes solo perdieron 3 líneas de import.

**Resultado: 55 SÍ, 0 NO, 1 NO VERIFICABLE (NFR-1, ver abajo) y el humo manual T16 pendiente de una persona.**

| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| REQ-1.1, 1.2, 1.3, 1.3a, 1.15, 1.17, 1.18, 1.19 | SÍ | tests `REQ-1.x` en `product-form.component.spec.ts`; `canAnalyzeImageWithAi`, `onImageFileSelected` y `loadCategoriesByUserId` en `product-form.component.ts` |
| REQ-1.4 | SÍ | tests en `product-form.component.spec.ts` (llama `analyzeImageFile` con archivo y categorías) y `product.service.spec.ts` (POST con `FormData`) |
| REQ-1.5, 1.16 | SÍ | `product-form-dialog.component.spec.ts`: analizar no crea ni sube; analizar y guardar crea 1 vez y sube 1 vez. El diálogo no cambió |
| REQ-1.6 a 1.14 | SÍ | tests `REQ-1.x` en `product-form.component.spec.ts`; `runImageAnalysis` y `product-form.html` (`isAnalyzingImage()` en guardar) |
| REQ-1.20 | SÍ | test `REQ-1.20` (destruir el fixture y emitir la respuesta: sin diálogo, sin avisos, formulario intacto); `takeUntilDestroyed` en `runImageAnalysis` |
| REQ-2.1 | SÍ | `product.controller.analyze-image.spec.ts` (201 y forma, ADMIN y GUEST, jpeg/png/webp) y `analyze-product-image.dto.spec.ts` |
| REQ-2.2, 2.3 | SÍ | mismo spec: 401 sin usuario (guard falso con `rejectUnauthenticatedWith401`) y 403 para `CLIENT` |
| REQ-2.4, 2.5 | SÍ | controller spec (415 con gif/pdf/txt; 413 con `MAX_IMAGE_SIZE_BYTES` bajo) y `multer-image-options.factory.spec.ts` |
| REQ-2.6, 2.7 | SÍ | controller spec (sin archivo, archivo en otro campo, 0 bytes → 400); `product.controller.ts` |
| REQ-2.8, 2.9, 2.10 | SÍ | controller spec por HTTP y spec del DTO; `parseCategories` en `analyze-product-image.dto.ts` |
| REQ-2.11 | SÍ | controller spec (`UPLOADS_DIR` temporal vacío tras éxito y rechazos) y factory spec (`memoryStorage` deja `buffer` y no `path`) |
| REQ-2.12, 2.13, 2.14 | SÍ | `product.controller.analyze-image.throttle.spec.ts` con `AiThrottlerGuard` real: 429, contador compartido, 400/413/415 cuentan y 401/403 no |
| REQ-2.15, 2.16 | SÍ | controller spec: 502 `OpenAI request failed` y 400 propagados del adaptador |
| REQ-2.17 | SÍ | `image-data-url.spec.ts` y controller spec (el doble recibe el `data:` URL y las categorías); el puerto `AiContentGenerator` no cambió |
| REQ-2.18 a 2.21 | SÍ | controller spec (200 categorías → 201, 201 → 400; dos archivos; segundo campo; campo > 64 KB) y factory spec (`files: 1`, `fields: 1`, `parts: 2`, `fieldSize: 65536`); `@ArrayMaxSize(200)` en el DTO |
| NFR-1 | SÍ (registro de T7) | Comparación en vivo del `/swagger/json` contra un worktree de `main` `c84fc73`: 35 paths antes y 36 después, agregado solo `/products/analyze-image`; `generate-from-image` y `generate-ai/{name}` idénticos. El `spec-verifier` no pudo reproducirla (no levanta el backend): confirmó que `git diff` del controller solo agrega `analyzeImage` |
| NFR-2 | SÍ | los seis comandos en verde (arriba); ningún test existente debilitado |
| NFR-3 | SÍ | `git diff` de `package.json`, locks, `src/database` y `.env-example` vacío |
| NFR-4 | SÍ (estático) | `@ApiConsumes('multipart/form-data')` y `@ApiBody` en `product.controller.ts`; el documento de Swagger lo mostró con `file` y `categories` requeridos (T7) |
| NFR-5 | SÍ | el lint exige `OnPush` y pasó; `selectedFile` es un signal |
| NFR-6 | SÍ | bundle inicial 764,54 kB (< 800 kB) |

**Pendiente de una persona:** T16, el humo manual con una `OPENAI_API_KEY` válida (crear producto → elegir imagen → «Analizar imagen con IA» → revisar campos → guardar; probar también un archivo de más de 5 MB y uno que no sea imagen). Los tests usan un doble de `AiContentGenerator`, así que ningún test llega a OpenAI de verdad.

---
**Estado:** Aprobada (2026-10-22)
