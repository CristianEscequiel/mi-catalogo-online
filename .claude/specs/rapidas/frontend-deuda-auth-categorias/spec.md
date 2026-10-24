# Deuda del frontend: login con perfil caído, `role` sin validar y columna «Categorías»

## Contexto
Tres ítems de «Abierto del frontend» en `.claude/specs/pendientes.md` (origen: `frontend-cleanup`). Rama `fix/frontend-deuda-auth-categorias`, desde `main` `fb5f7f5`. Solo frontend.

## Qué se pide
1. `AuthFacade.loginUser`: si el login es correcto pero `getUserById` falla, hoy la sesión queda guardada y la UI dice «Credenciales inválidas». Debe limpiar la sesión y avisar que falló la carga del perfil.
2. `AuthStore.rehydrate()`: un `role` de `userLite` editado a mano habilita menú y rutas de admin en el cliente. Debe validarse contra `ADMIN | CLIENT | GUEST`.
3. Tabla de productos del admin: la columna «Categorías» llama `getCategoryNames(row.categoryIds)`, pero `ProductResModel` no tiene `categoryIds` (tiene `categories[]`), así que siempre muestra «-».

## Criterios de aceptación
- REQ-1.1: CUANDO el login responde bien y `getUserById` falla, EL SISTEMA DEBERÁ dejar `token`, `userLite` y `userProfile` vacíos en el store y borrar `token` y `userLite` de `localStorage`.
- REQ-1.2: CUANDO el login responde bien y `getUserById` falla, EL SISTEMA DEBERÁ mostrar el aviso «No pudimos cargar tu perfil. Intenta nuevamente.» (y no «Credenciales invalidas»), rechazar la promesa con `LOGIN_FAILED` y no navegar.
- REQ-1.3: CUANDO el login falla por credenciales o red, EL SISTEMA DEBERÁ seguir mostrando «Credenciales invalidas. Intenta nuevamente.» (sin cambios).
- REQ-1.4: EN TODO desenlace de `loginUser`, `loadingProfile` DEBERÁ quedar en `false`.
- REQ-2.1: CUANDO `userLite` guardado trae un `role` que no es `ADMIN`, `CLIENT` ni `GUEST`, EL SISTEMA DEBERÁ arrancar sin sesión y borrar `token` y `userLite` de `localStorage`.
- REQ-2.2: CUANDO `userLite` guardado trae un `role` válido, o no trae `role`, EL SISTEMA DEBERÁ restaurar la sesión como hoy.
- REQ-3.1: CUANDO un producto tiene categorías conocidas, EL SISTEMA DEBERÁ mostrar en la columna «Categorías» sus nombres separados por coma.
- REQ-3.2: CUANDO un producto no tiene categorías, EL SISTEMA DEBERÁ mostrar «-».
- REQ-3.3: `getCategoryNames` DEBERÁ recibir los ids derivados de `row.categories`; `categoryIds` no existe en `ProductResModel`.

## Fuera de alcance
- Expiración del token (Fase 4). `LoginResponse.user.id` tipado con el literal `1`. `AuthStore.loadingProfile` sin lectores.
- Cambiar el backend ni qué devuelve el login.
- Los nombres de categoría salen de `categoryService` (lista completa); no se usa `categories[].name` del producto.
