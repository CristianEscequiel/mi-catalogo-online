# Plan

Orden: test que falla → código → verde. Un archivo de spec existente por cambio, sin tocar tests ajenos.

1. `core/state/auth.store.ts` + `auth.store.spec.ts` (REQ-2.1, 2.2): `parseUserLite` rechaza un `role` presente y fuera de `ADMIN|CLIENT|GUEST` (constante de roles exportada junto a `UserRole`); sin `role` sigue válido.
2. `features/auth/services/auth.facade.ts` + `auth.facade.spec.ts` (REQ-1.1 a 1.4): separar el `try` del login del `try` del perfil; en el segundo, `store.clear()`, `notificationService.error('No pudimos cargar tu perfil. Intenta nuevamente.')`, `throw new Error('LOGIN_FAILED')`; `finally` mantiene `setLoadingProfile(false)`.
3. `product-list.component.ts` / `product-list.html` + spec nuevo o existente (REQ-3.1 a 3.3): pasar `row.categories` ids a `getCategoryNames`.
4. Validación: `npm run lint`, `npx ng test --no-watch --browsers=ChromeHeadless`, `npm run build` en `frontend/`.
5. Cierre: `notes.md`, tildar los tres ítems en `pendientes.md` (commit de docs aparte).
