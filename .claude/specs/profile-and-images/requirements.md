# Requisitos: profile-and-images

Cierra los tres hallazgos del humo manual de `frontend-cleanup` (T20, 2026-10-19). Los tres existían en `main` antes de esa spec: no son regresiones. **Solo frontend**: el backend ya expone todo lo necesario.

Estado: **cerrada el 2026-10-19** (PR abierto y CI en verde, según informó el usuario). Aprobada (v3; enmendada el mismo día por la parada de bundle tras T4: NFR-8, NFR-9, y ajustes de NFR-3 y NFR-7; y REQ-3.6 y REQ-4.27 a 4.31 tras la auditoría de código), con tres enmiendas surgidas al diseñar, pendientes de confirmar: REQ-2.14/2.15 (textos bajo el selector y del aviso emergente), REQ-3.1 (la vista previa va en el panel grande del formulario) y REQ-3.2 (solo en modo `controls`). La v1 y la v2 fueron revisadas por `spec-reviewer` (v1: 4 bloqueantes y 6 menores; v2: 2 bloqueantes y 5 menores; todos incorporados en esta versión).

## 1. Contexto y decisiones

**Estado medido el 2026-10-19 (rama `feat/profile-and-images`, desde `origin/main` `f1d4542`):**

| Tema | Hoy |
|---|---|
| Guardar el perfil | `profile.html:29` tiene el botón «Guardar» sin `(ngSubmit)` ni `(click)`, y `Profile` no tiene ningún método de guardado: la función nunca se implementó. El backend **ya tiene** `PUT /users/:id` (`users.controller.ts`, `SelfOrAdminGuard`) que acepta `{ profile: { name, lastName } }` (`UpdateUserDto`, `UpdateProfileDto`) y devuelve la entidad completa; `AuthService` no tiene el método que lo llame. |
| Imagen inválida | `ImageFieldComponent` no valida nada en el cliente: el `<input accept=".jpg,.jpeg,.png,.webp">` solo filtra el diálogo del sistema operativo y se saltea con «Todos los archivos». El texto «Formatos permitidos: jpg, jpeg, png, webp» no dice el tamaño. El backend rechaza con **415** (MIME fuera de `image/jpeg`, `image/png`, `image/webp`) y con **413** (más de `MAX_IMAGE_SIZE_BYTES`, variable de entorno cuyo valor por defecto es `DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024` en `file.constants.ts`). Los tres usos (perfil, producto, categoría) convierten cualquier error en un texto genérico: «No se pudo subir la imagen de perfil.» (perfil, `profile.ts`) o «No se pudo subir la imagen.» (producto y categoría). |
| Vista previa del producto | `ImageFieldComponent` con `mode="controls"` (el de `product-form.html`) calcula `previewUrl` al elegir un archivo pero **no lo muestra**: solo cambia el texto del botón. En modo `default` (perfil, categoría) sí se ve. |
| Crear con imagen | En modo `create`, `ProductFormDialogComponent.onSubmit` crea el producto y **después** sube la imagen. `uploadImageForEntity` ya muestra el aviso de error de imagen y relanza el error; el `catch` externo muestra además «No se pudo crear el producto.», pero el producto **ya existe** y el diálogo sigue abierto en modo `create`: reintentar crea un duplicado. `CategoryFormDialogComponent` tiene el mismo código y defecto; además su rama `edit` (`category-form-dialog.component.ts:91-95`) no captura el error de `uploadImageForEntity` ni tiene estado de guardado. En ambos diálogos `selectedImageFile` es un campo plano, no un signal. |

**Decisiones tomadas (con el usuario, 2026-10-19):**
- Los límites de imagen son **constantes del frontend** (JPG, PNG o WebP; 5 MB). El backend sigue siendo la validación definitiva: el 413/415 que devuelve es la red de seguridad si `MAX_IMAGE_SIZE_BYTES` se cambió en un despliegue.
- Flujo de creación: **vista previa antes de guardar** y **manejo del fallo de imagen tras crear** (el diálogo pasa a modo edición, sin duplicados). La subida previa a una carpeta temporal queda fuera.
- Perfil: «Guardar» + «Cancelar» + aviso de éxito o error. El email sigue fuera del formulario.
- Rama de trabajo: `feat/profile-and-images`, desde `origin/main`.

**Decisiones de la spec (a confirmar al aprobar):**
- **Categorías incluidas** en el manejo del fallo tras crear (REQ-4.15 a 4.19, más la categoría en REQ-4.20 a 4.26): comparten el patrón y el defecto con producto, y el arreglo reutiliza la misma lógica. Si no se aprueba, se quitan REQ-4.15 a 4.19 y la categoría de REQ-4.20 a 4.26.
- **Regla de formato:** se mira solo `file.type`, igual que el backend (que mira el MIME declarado). Un archivo con `file.type` vacío se rechaza como formato no permitido.
- **Textos genéricos de error:** bajo el selector va «No se pudo subir la imagen.» en los tres usos; el aviso emergente conserva el texto de hoy de cada uno («…imagen de perfil.» en perfil, «…la imagen.» en producto y categoría), para no romper los tests existentes (`profile.spec.ts` REQ-3.7). *(Enmienda del 2026-10-19: la v3 pedía «…de perfil.» también bajo el selector, lo que rompía ese test.)*
- **Fuente de los datos del store al guardar el perfil:** los valores enviados (recortados), no la respuesta del `PUT`.

**Fuera de alcance:**
- Cambiar email, contraseña o rol desde el perfil.
- Subir la imagen antes de crear la entidad (carpeta temporal, limpieza de huérfanos) y el análisis con IA antes de guardar el producto: requieren backend.
- Exponer los límites desde el backend, validar *magic bytes*, varias imágenes por producto.
- Cambios en el backend, dependencias nuevas, cambios de estilo ajenos a estos flujos.
- Los demás pendientes de `pendientes.md` (login con perfil caído, `role` sin validar, etc.).

## 2. Requisitos

Convención: un comportamiento por criterio. Cuando un aviso emergente o un mensaje de rechazo se nombra con ids (por ejemplo «REQ-2.11, 2.13 y 2.15»), se refiere a esos criterios exactos.

### REQ-1: Guardar el perfil

- **REQ-1.1** CUANDO el usuario pulsa «Guardar» con el formulario válido y con cambios, EL SISTEMA DEBERÁ enviar `PUT /users/:id` con el cuerpo `{ "profile": { "name", "lastName" } }`, con ambos valores sin espacios al inicio ni al final.
- **REQ-1.2** CUANDO el usuario pulsa «Guardar» varias veces mientras la petición está en curso, EL SISTEMA DEBERÁ enviar un único `PUT`.
- **REQ-1.3** SI hay una petición de guardado en curso ENTONCES EL SISTEMA DEBERÁ mostrar «Guardar» deshabilitado e indicando que está guardando.
- **REQ-1.4** SI hay una petición de guardado en curso ENTONCES EL SISTEMA DEBERÁ mostrar «Cancelar» deshabilitado.
- **REQ-1.5** CUANDO el backend responde con éxito, EL SISTEMA DEBERÁ actualizar `name` y `lastName` en `AuthStore` con los valores enviados, conservando `id`, `email` y `avatar`.
- **REQ-1.6** CUANDO el backend responde con éxito, EL SISTEMA DEBERÁ mostrar el aviso «Perfil actualizado correctamente.».
- **REQ-1.7** CUANDO el backend responde con éxito, EL SISTEMA DEBERÁ dejar el formulario en solo lectura mostrando los valores nuevos.
- **REQ-1.8** SI la petición falla (cualquier error) ENTONCES EL SISTEMA DEBERÁ mostrar el aviso de error «No se pudo guardar el perfil.».
- **REQ-1.9** SI la petición falla ENTONCES EL SISTEMA DEBERÁ dejar el formulario en edición con lo que el usuario escribió.
- **REQ-1.10** SI la petición falla ENTONCES EL SISTEMA DEBERÁ volver a habilitar «Guardar» y «Cancelar».
- **REQ-1.11** CUANDO el usuario pulsa «Cancelar», EL SISTEMA DEBERÁ restaurar nombre y apellido desde el perfil del store y volver a solo lectura.
- **REQ-1.12** CUANDO el usuario pulsa «Cancelar», EL SISTEMA DEBERÁ no enviar ninguna petición.
- **REQ-1.13** SI el nombre o el apellido están vacíos o solo tienen espacios ENTONCES EL SISTEMA DEBERÁ mantener «Guardar» deshabilitado.
- **REQ-1.14** SI el nombre o el apellido están vacíos o solo tienen espacios y el campo fue tocado ENTONCES EL SISTEMA DEBERÁ mostrar bajo el campo «El nombre es obligatorio.» o «El apellido es obligatorio.» según corresponda.
- **REQ-1.15** SI los valores recortados de nombre y apellido son iguales a los del perfil del store ENTONCES EL SISTEMA DEBERÁ mantener «Guardar» deshabilitado.
- **REQ-1.16** CUANDO se sube o se borra la imagen de perfil mientras se edita, EL SISTEMA DEBERÁ conservar lo escrito en los campos (comportamiento ya existente de `frontend-cleanup` REQ-3, que no debe romperse).
- **REQ-1.17** CUANDO el usuario pulsa «Editar» (botón que ya existe en `profile.html`), EL SISTEMA DEBERÁ habilitar los campos y mostrar «Guardar» y «Cancelar».

### REQ-2: Validar la imagen y decir las reglas (perfil, producto y categoría)

- **REQ-2.1** CUANDO se muestra el selector de imagen, EL SISTEMA DEBERÁ mostrar junto a él los formatos permitidos (JPG, PNG o WebP) y el tamaño máximo (5 MB).
- **REQ-2.2** CUANDO el usuario elige un archivo cuyo `file.type` no es `image/jpeg`, `image/png` ni `image/webp` (incluido un `file.type` vacío), EL SISTEMA DEBERÁ no emitirlo hacia el formulario y no subirlo.
- **REQ-2.3** CUANDO el usuario elige un archivo con formato no permitido (REQ-2.2), EL SISTEMA DEBERÁ mostrar junto al selector «Formato no permitido. Usa JPG, PNG o WebP.».
- **REQ-2.4** CUANDO el usuario elige un archivo de más de 5 MB (5 242 880 bytes), EL SISTEMA DEBERÁ no emitirlo hacia el formulario y no subirlo.
- **REQ-2.5** CUANDO el usuario elige un archivo de más de 5 MB, EL SISTEMA DEBERÁ mostrar junto al selector un mensaje con el tamaño del archivo y el máximo, por ejemplo «La imagen pesa 7,2 MB y el máximo es 5 MB.».
- **REQ-2.6** CUANDO el selector muestra un mensaje de rechazo, EL SISTEMA DEBERÁ anunciarlo con `role="alert"`.
- **REQ-2.7** CUANDO el usuario elige un archivo válido o descarta la selección, EL SISTEMA DEBERÁ quitar el mensaje de rechazo del selector.
- **REQ-2.8** CUANDO el selector rechaza un archivo, EL SISTEMA DEBERÁ conservar sin cambios la selección o imagen anterior.
- **REQ-2.9** CUANDO el selector rechaza un archivo, EL SISTEMA DEBERÁ vaciar el `<input>`, de modo que el usuario pueda volver a elegir el mismo archivo.
- **REQ-2.10** CUANDO el backend rechaza la subida con 415, EL SISTEMA DEBERÁ mostrar bajo el selector el mensaje de formato de REQ-2.3.
- **REQ-2.11** CUANDO el backend rechaza la subida con 415, EL SISTEMA DEBERÁ mostrar el aviso emergente con el mensaje de formato de REQ-2.3.
- **REQ-2.12** CUANDO el backend rechaza la subida con 413, EL SISTEMA DEBERÁ mostrar bajo el selector un mensaje de tamaño que nombre el máximo de 5 MB.
- **REQ-2.13** CUANDO el backend rechaza la subida con 413, EL SISTEMA DEBERÁ mostrar el aviso emergente con ese mensaje de tamaño.
- **REQ-2.14** SI la subida falla con un error distinto de 413 y 415 ENTONCES EL SISTEMA DEBERÁ mostrar bajo el selector «No se pudo subir la imagen.» (en perfil, producto y categoría).
- **REQ-2.15** SI la subida falla con un error distinto de 413 y 415 ENTONCES EL SISTEMA DEBERÁ mostrar el aviso emergente «No se pudo subir la imagen de perfil.» en el perfil y «No se pudo subir la imagen.» en producto y categoría.

**Precedencia:** en el flujo de creación de REQ-4.1 y REQ-4.15, el aviso emergente es el que fija ese criterio y **reemplaza** al de REQ-2.11, 2.13 y 2.15; el mensaje bajo el selector sigue las reglas REQ-2.10, 2.12 y 2.14.

### REQ-3: Vista previa en el formulario de producto

- **REQ-3.1** CUANDO el usuario elige un archivo válido en el selector en modo `controls` (formulario de producto), EL SISTEMA DEBERÁ mostrarlo antes de que se suba en el panel «Vista previa del producto» del formulario, en lugar del texto «Sin imagen seleccionada» o de la imagen guardada.
- **REQ-3.2** CUANDO hay un archivo elegido en el selector en modo `controls` que todavía no se subió, EL SISTEMA DEBERÁ ofrecer una acción «Quitar» que descarte la selección y la miniatura.
- **REQ-3.3** CUANDO el diálogo de producto está en modo `create` y hay un archivo elegido, EL SISTEMA DEBERÁ mostrar el aviso «La imagen se subirá al guardar el producto.».
- **REQ-3.4** CUANDO el archivo elegido se reemplaza por otro, se descarta o el componente se destruye, EL SISTEMA DEBERÁ liberar la URL temporal de la miniatura (`URL.revokeObjectURL`).
- **REQ-3.5** CUANDO la subida termina y llega la imagen guardada, EL SISTEMA DEBERÁ mostrar esa imagen en lugar de la miniatura local (comportamiento ya existente).
- **REQ-3.6** *(agregado el 2026-10-19, hallazgo M4 de la auditoría)* CUANDO el `imageUrl` del formulario de producto pasa a nulo (por ejemplo, al borrar la imagen anterior para reemplazarla) y hay un archivo elegido sin subir, EL SISTEMA DEBERÁ conservar la vista previa de ese archivo en el panel.

### REQ-4: Si la imagen falla después de crear

**Producto**

- **REQ-4.1** CUANDO el producto se crea con éxito y la subida de su imagen falla, EL SISTEMA DEBERÁ mostrar un único aviso emergente: «Producto creado, pero no se pudo subir la imagen. Puedes reintentarlo.», sin el aviso genérico de imagen ni «No se pudo crear el producto.».
- **REQ-4.2** CUANDO ocurre REQ-4.1, EL SISTEMA DEBERÁ mantener el diálogo abierto.
- **REQ-4.3** CUANDO ocurre REQ-4.1, EL SISTEMA DEBERÁ pasar el diálogo a modo edición del producto recién creado (con su `id`).
- **REQ-4.4** CUANDO ocurre REQ-4.1, EL SISTEMA DEBERÁ conservar los datos del formulario.
- **REQ-4.5** CUANDO ocurre REQ-4.1, EL SISTEMA DEBERÁ conservar el archivo elegido sin subirlo automáticamente al cambiar de modo.
- **REQ-4.6** CUANDO ocurre REQ-4.1, EL SISTEMA DEBERÁ mostrar bajo el selector el mensaje de error de imagen según REQ-2.10, 2.12 o 2.14.
- **REQ-4.7** CUANDO el usuario pulsa «Guardar» con el diálogo en el estado de REQ-4.3, EL SISTEMA DEBERÁ editar el producto existente (`PUT`) y no crear otro.
- **REQ-4.8** CUANDO el usuario pulsa «Guardar» en ese estado con un archivo elegido, EL SISTEMA DEBERÁ reintentar la subida de ese archivo.
- **REQ-4.9** CUANDO el usuario pulsa «Guardar» en ese estado sin archivo elegido (por ejemplo, tras «Quitar»), EL SISTEMA DEBERÁ hacer solo el `PUT`, sin subida.
- **REQ-4.10** CUANDO el `PUT` y el reintento terminan bien, EL SISTEMA DEBERÁ mostrar «Producto actualizado correctamente.».
- **REQ-4.11** CUANDO el `PUT` y el reintento terminan bien, EL SISTEMA DEBERÁ cerrar el diálogo con el resultado `'updated'`.
- **REQ-4.12** SI el `PUT` del reintento falla ENTONCES EL SISTEMA DEBERÁ mostrar «No se pudo actualizar el producto.» y mantener el diálogo abierto con los botones habilitados.
- **REQ-4.13** SI la subida del reintento falla ENTONCES EL SISTEMA DEBERÁ mostrar el aviso emergente de REQ-2.11, 2.13 o 2.15 y el mensaje bajo el selector de REQ-2.10, 2.12 o 2.14.
- **REQ-4.14** SI la subida del reintento falla ENTONCES EL SISTEMA DEBERÁ mantener el diálogo abierto en modo edición con los botones habilitados.

**Categoría** *(paquete condicional: si no se aprueba incluir categorías, se quitan REQ-4.15 a 4.19 y la palabra «categoría» de REQ-4.20 a 4.26)*

- **REQ-4.15** CUANDO la categoría se crea con éxito y la subida de su imagen falla, EL SISTEMA DEBERÁ aplicar el mismo comportamiento de REQ-4.1 a REQ-4.6 con el aviso «Categoría creada, pero no se pudo subir la imagen. Puedes reintentarlo.».
- **REQ-4.16** CUANDO el usuario pulsa «Guardar» con una categoría ya creada en ese estado, EL SISTEMA DEBERÁ aplicar el mismo comportamiento de REQ-4.7 a REQ-4.14 (con «Categoría actualizada correctamente.» y «No se pudo actualizar la categoría.»).
- **REQ-4.17** CUANDO el usuario pulsa «Guardar» en el diálogo de categoría en modo edición y la subida de la imagen falla, EL SISTEMA DEBERÁ capturar el error, sin dejar un rechazo de promesa sin manejar.
- **REQ-4.18** CUANDO ocurre REQ-4.17, EL SISTEMA DEBERÁ mostrar el aviso de REQ-2.11, 2.13 o 2.15 y el mensaje bajo el selector de REQ-2.10, 2.12 o 2.14.
- **REQ-4.19** CUANDO ocurre REQ-4.17, EL SISTEMA DEBERÁ mantener el diálogo abierto con los botones habilitados.

**Cierre y errores de creación (producto y categoría)**

- **REQ-4.20** CUANDO el usuario cierra o cancela el diálogo después de que la entidad se creó (REQ-4.3, REQ-4.15), EL SISTEMA DEBERÁ cerrarlo con el resultado `'updated'`, para que la lista se refresque.
- **REQ-4.21** CUANDO la creación y la subida de la imagen terminan bien, EL SISTEMA DEBERÁ mostrar «Producto creado correctamente.» o «Categoría creada correctamente.».
- **REQ-4.22** CUANDO la creación y la subida de la imagen terminan bien, EL SISTEMA DEBERÁ cerrar el diálogo con el resultado `'updated'`.
- **REQ-4.23** CUANDO la creación falla con 403, EL SISTEMA DEBERÁ mostrar «Límite de demo alcanzado».
- **REQ-4.24** CUANDO la creación falla con 403, EL SISTEMA DEBERÁ dejar el diálogo abierto en modo `create`.
- **REQ-4.25** CUANDO la creación falla con cualquier otro error, EL SISTEMA DEBERÁ mostrar «No se pudo crear el producto.» o «No se pudo crear la categoría.».
- **REQ-4.26** CUANDO la creación falla con cualquier otro error, EL SISTEMA DEBERÁ dejar el diálogo abierto en modo `create`.
- **REQ-4.27** *(agregado el 2026-10-19, hallazgo M2 de la auditoría; producto y categoría)* SI hay una subida de imagen en curso ENTONCES EL SISTEMA DEBERÁ mostrar «Guardar» deshabilitado.
- **REQ-4.28** *(M2; producto y categoría)* SI hay una subida de imagen en curso ENTONCES EL SISTEMA DEBERÁ mostrar «Cancelar» deshabilitado y no cerrar el diálogo desde `onCancel()`.
- **REQ-4.29** *(M2; producto y categoría)* CUANDO se invoca `onSubmit()` mientras hay una subida de imagen en curso, EL SISTEMA DEBERÁ no hacer nada: ni una segunda subida ni el `PUT`.
- **REQ-4.30** *(agregado el 2026-10-19, hallazgo M1 de la auditoría; producto y categoría)* CUANDO la subida automática de la imagen en modo edición falla, EL SISTEMA DEBERÁ mostrar el aviso de error de REQ-2.11, 2.13 o 2.15 sin dejar un rechazo de promesa sin manejar.
- **REQ-4.31** *(M1; producto y categoría)* CUANDO el borrado de la imagen en modo edición falla, EL SISTEMA DEBERÁ mostrar el aviso «No se pudo eliminar la imagen.» sin dejar un rechazo de promesa sin manejar.

## 3. Criterios de verificación de restricciones (NFR)

Las restricciones también se escriben como criterios medibles.

- **NFR-1** CUANDO se ejecuta `npm run lint` en `frontend/`, EL SISTEMA DEBERÁ terminar con código 0 y sin agregar `eslint-disable`.
- **NFR-2** CUANDO se ejecuta `npx ng test --no-watch --browsers=ChromeHeadless`, EL SISTEMA DEBERÁ pasar todos los tests, incluidos los 172 actuales y los nuevos, sin tests desactivados; si un cambio rompe uno existente, se corrige en el mismo cambio.
- **NFR-3** CUANDO se ejecuta `npm run build` en `frontend/`, EL SISTEMA DEBERÁ terminar con código 0 y sin aviso de presupuesto. **Riesgo:** la línea base medida el 2026-10-19 es de 795,99 kB sobre un límite de 800 kB (margen de 4,01 kB) y `Profile` y el componente de imagen están en el bundle inicial. Si el código nuevo agota el margen, se para y se vuelve a esta spec para decidir (recortar o ajustar el presupuesto); no se toca `angular.json` por cuenta propia. **Resuelto el 2026-10-19 (tras T4, con 799,15 kB):** el usuario eligió cargar `Profile` de forma perezosa (NFR-8) en lugar de subir el presupuesto o recortar código.
- **NFR-4** CUANDO se busca con `grep` en `frontend/src/app` el literal `5 * 1024 * 1024` (o `5242880`) y la lista de MIME `image/jpeg`, EL SISTEMA DEBERÁ encontrarlos en un único archivo de reglas de imagen (sin contar los `.spec.ts`), que cita en un comentario `ALLOWED_IMAGE_MIME_TYPES` y `DEFAULT_MAX_IMAGE_SIZE_BYTES` / `MAX_IMAGE_SIZE_BYTES` del backend como los valores que debe igualar.
- **NFR-5** CUANDO se busca `console.log` en `image-field.component.ts`, EL SISTEMA DEBERÁ no encontrar ninguno (hoy `console.log('User confirmed deletion')`).
- **NFR-6** CUANDO se revisan los componentes nuevos o modificados, EL SISTEMA DEBERÁ mostrar `ChangeDetectionStrategy.OnPush` en cada uno y `selectedImageFile` de los diálogos de producto y categoría como signal.
- **NFR-7** CUANDO se compara el árbol de trabajo con `origin/main`, EL SISTEMA DEBERÁ no mostrar cambios en `backend/`, `.github/`, `angular.json` ni en las dependencias de `package.json`; dentro de `frontend/src/app` solo se tocan los componentes, servicios y utilidades de esta spec y `app.routes.ts` (NFR-8 y NFR-9).
- **NFR-8** *(agregado el 2026-10-19, al agotarse el margen de bundle en T4; decisión del usuario)* CUANDO se revisa `app.routes.ts`, EL SISTEMA DEBERÁ mostrar la ruta `profile` con `loadComponent` y con `canActivate: [authGuard]`.
- **NFR-9** *(agregado el 2026-10-19)* CUANDO se ejecuta `npm run build` en `frontend/`, EL SISTEMA DEBERÁ generar `Profile` en un chunk perezoso, fuera del total inicial.

## 4. Verificación manual (la hace una persona, con el backend local)

Los tests no ven el navegador real. Antes de cerrar: (1) editar nombre y apellido, guardar, recargar y ver los datos nuevos; provocar un error (backend apagado) y ver el aviso; (2) elegir un `.pdf` y un `.png` de más de 5 MB en perfil, producto y categoría; (3) crear un producto con imagen y ver la miniatura antes de guardar; (4) provocar el fallo de la subida tras crear (por ejemplo, bajando `MAX_IMAGE_SIZE_BYTES` en el backend local) y comprobar que no se duplica el producto.

## 5. Verificación final

Verificación de `spec-verifier`, 2026-10-19. **Veredicto: CERRABLE. 0 criterios en NO; 1 NO VERIFICABLE** (el humo manual, informado como «todo ok» sin detalle por paso). El CI en Actions lo confirmó el usuario tras abrir el PR.

**Ejecución (desde `frontend/`):** `npm run lint` código 0 (1 `eslint-disable`, el preexistente de `product-list.component.ts:147`) · `ng test` **310 de 310 en verde**, 0 fallados, 0 omitidos · `npm run build` código 0, total inicial **764,37 kB** (límite 800 kB), sin aviso de presupuesto, `profile` como chunk perezoso de 6,34 kB.

| Criterio | ¿Cumplido? | Evidencia |
|---|---|---|
| REQ-1.1 | SÍ | `auth.service.spec.ts` (PUT con URL y cuerpo exactos) y 3 `it()` en `profile.spec.ts` |
| REQ-1.2 a 1.12 | SÍ | al menos un `it()` por id en `profile.spec.ts` (doble envío, «Guardando…», éxito, error, cancelar) |
| REQ-1.13 a 1.15 | SÍ | `it()` por id en `profile.spec.ts` (espacios en blanco, mensajes bajo el campo, sin cambios) |
| REQ-1.16 | SÍ (indirecta) | sin `it()` con ese id; lo cubre el test existente `REQ-3.1: subir una imagen mientras se edita…` |
| REQ-1.17 | SÍ | `it()` REQ-1.17 en `profile.spec.ts` |
| REQ-2.1 | SÍ | `image-field.component.spec.ts`; `IMAGE_RULES_HINT` en `image-rules.ts:10` |
| REQ-2.2 a 2.9 | SÍ | `image-field.component.spec.ts` e `image-rules.spec.ts` |
| REQ-2.10 a 2.13 | SÍ | perfil `profile.spec.ts:468-486`; helper `image-rules.spec.ts:58-70`; producto y categoría bajo ids REQ-4.6 y 4.13 |
| REQ-2.14, 2.15 | SÍ | perfil `profile.spec.ts:161-162`; producto `product-form-dialog…spec.ts:387-388`; categoría `category-form-dialog…spec.ts:349-350` |
| REQ-3.1 a 3.5 | SÍ | `product-form.component.spec.ts` y `image-field.component.spec.ts:231,245,257,269` |
| REQ-3.6 | SÍ | 2 `it()` en `product-form.component.spec.ts` |
| REQ-4.1 a 4.14 | SÍ | `product-form-dialog.component.spec.ts`, un `it()` por id (4.13 en `:378-388`) |
| REQ-4.15 a 4.19 | SÍ | `category-form-dialog.component.spec.ts` y `category-form.component.spec.ts` |
| REQ-4.20 a 4.26 | SÍ | `it()` por id en ambos diálogos |
| REQ-4.27 a 4.31 | SÍ | `it()` por id en ambos diálogos (y en los hijos para 4.27 y 4.28) |
| NFR-1 | SÍ | lint 0, sin `eslint-disable` nuevos |
| NFR-2 | SÍ | 310 de 310; sin `xit`, `fit`, `.skip` ni `pending` |
| NFR-3 | SÍ | build 764,37 kB sin aviso |
| NFR-4 | SÍ | `5 * 1024 * 1024` e `image/jpeg` solo en `image-rules.ts:5-6`, con el comentario al backend en `:3-4` |
| NFR-5 | SÍ | sin `console.log` en `image-field.component.ts` ni en el resto de `src/app` (fuera de specs) |
| NFR-6 | SÍ | tests en verde y `grep`/revisión del registro T12 (no se releyeron los 6 componentes uno por uno) |
| NFR-7 | SÍ | `git diff origin/main`: sin cambios en `backend/`, `.github/`, `angular.json` ni `package.json` |
| NFR-8 | SÍ | `app.routes.ts`: `loadComponent` con `canActivate: [authGuard]`; sin test automático, la evidencia es el diff |
| NFR-9 | SÍ | build: chunk perezoso `profile` de 6,34 kB, fuera del total inicial |
| Humo manual (§4 / T13) | **NO VERIFICABLE** | el usuario informó «todo ok» sin detalle por paso |
| CI en Actions | SÍ (informado por el usuario) | el usuario abrió el PR el 2026-10-19 y informó que el CI pasó; el verificador no lo vio directamente |

**Calidad de evidencia (bajas):** REQ-1.16 sin `it()` propio; los REQ-2.10 a 2.15 de producto y categoría se prueban bajo ids REQ-4.x; NFR-8 sin test automático; los ids `REQ-n.m` se repiten con los de `frontend-cleanup` en los specs que ya existían (se distinguen por el `describe`). **Integridad de los tests:** los 8 hashes de `tests-baseline.txt` coinciden; la ampliación de 4 specs está autorizada con una nota fechada; los `it()` existentes no se debilitaron.
