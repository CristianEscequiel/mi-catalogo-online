# Registro

## 2026-10-23
Se cerraron tres deudas del frontend. `loginUser` separa el fallo de credenciales del fallo de perfil (en el segundo limpia la sesión y avisa «No pudimos cargar tu perfil»). `AuthStore.rehydrate()` invalida la sesión si `role` no es `ADMIN|CLIENT|GUEST` (sin `role` sigue válida). La columna «Categorías» del admin ahora usa `row.categories`. Además `.claude/specs/rapidas/` entró al `.gitignore`.

**Archivos:** `.gitignore`, `core/state/auth.store.ts` (+spec), `features/auth/services/auth.facade.ts` (+spec), `features/catalog-admin/products/components/product-list/product-list.{component.ts,html}` (+spec).

**Desvíos:** ninguno. El `spec-verifier` marcó REQ-1.4 sin test; se agregó la aserción de `setLoadingProfile` (`[true],[false]`) en los tres desenlaces.

**Verificación:** REQ-1.1 a 1.4, 2.1, 2.2 y 3.1 a 3.3: sí. Lint 0, Karma 344 de 344 (336 antes), build ok con 764,77 kB.

**Pendientes fuera de alcance:** ninguno nuevo.
