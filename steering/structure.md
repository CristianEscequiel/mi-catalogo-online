---
inclusion: always
---

# Estructura del proyecto

Monorepo con frontend y backend en el mismo workspace.

## Organización de carpetas

```
/
├─ frontend/            Angular 20 (src/app)
├─ backend/             NestJS 11 (src)
├─ docker-compose.yml   stack completo (frontend, backend, PostgreSQL)
├─ .github/workflows/   CI/CD (ci.yml)
├─ .claude/skills/      skills del agente
├─ steering/            contexto del proyecto (este directorio)
└─ specs/               specs de sdd-flow (rapidas/ no se versiona)
```

### Frontend (`frontend/src/app`)
```
core/        config, guards, interceptors, layouts, models, services (cart, favorites, orders, theme, notification), state (auth/cart/favorites store)
features/    auth, cart, catalog-admin (products, categories, orders), checkout, home, product-detail, profile
shared/      components (confirm-dialog, image-field), header, notifications, utils
```
- `core/` es lo transversal y singleton; cada pantalla de negocio vive en `features/<dominio>`.
- Lo reutilizable entre features va en `shared/`.

### Backend (`backend/src`)
```
ai/  auth/  cart/  database/  favorites/  files/  health/  mail/  orders/  product/  users/
```
- Cada módulo de dominio agrupa su `*.module.ts`, controllers, services, `dto/`, `entities/` (y `models/` o `roles/` si aplica).
- `product/` incluye productos y categorías. `auth/` incluye estrategias JWT y guard de roles.
- `database/` contiene `ormconfig.ts` y `migrations/`. `files/` centraliza el almacenamiento de imágenes.

## Capas

```
Angular (components → services/stores)
  ↓ HTTP (API_BASE_URL)
NestJS Controllers (HTTP, validación DTO)
  ↓
NestJS Services (lógica de negocio)
  ↓
Repositorios TypeORM → PostgreSQL
```

## Convención de nombres
- Frontend: archivos en kebab-case (`cart-page.ts`, `auth.store.ts`); páginas `*-page`, stores `*.store.ts`.
- Backend: `<recurso>.controller.ts`, `.service.ts`, `.module.ts`, `dto/create-*.dto.ts`, `entities/*.entity.ts`.
- API REST: recursos en plural, verbos HTTP estándar (`GET/POST/PATCH/DELETE`).

## Patrones de import
- Backend: mezcla rutas relativas y absolutas desde la raíz (`import ... from 'src/users/users.module'`); preferir el estilo del archivo que se edita.
- Frontend: rutas relativas (no hay alias de paths en `tsconfig.json`).

## Decisiones de arquitectura
- Organización por feature (dominio), con capas dentro de cada módulo.
- Controllers delgados; la lógica vive en services; los DTOs validan toda entrada.
- Imágenes: se guarda una ruta relativa `/uploads/<carpeta>/<archivo>` en DB; el frontend la resuelve con `resolveImageUrl` y `API_BASE_URL`. Regla actual: 1 imagen por entidad.
- Cada capa tiene una responsabilidad clara; no mezclar responsabilidades de frontend y backend.
- Usuario autenticado: los controllers lo reciben con `@CurrentUser() user: Payload` (`backend/src/auth/current-user.decorator.ts`), no con `@Request()`. El único `@Request()` que queda es el login con la estrategia `local`.
- Proveedores externos detrás de puertos: los servicios de dominio no dependen de Resend, OpenAI ni del disco, sino de `MailSender` (`mail/mail-sender.port.ts`), `AiContentGenerator` (`ai/ai-content-generator.port.ts`) e `ImageStorage` (`files/image-storage.port.ts`).
  - El puerto es una clase abstracta (sirve de token de inyección de Nest, sin `@Inject`). El adaptador la implementa (`implements`) y su módulo lo registra **bajo el token del puerto**: `providers: [{ provide: MailSender, useClass: MailService }], exports: [MailSender]`. Solo se exporta el puerto.
  - Los consumidores importan el puerto, nunca el archivo del adaptador (`mail.service`, `file-storage.service`, `openai.service`), que solo se importa desde su módulo y su spec.
  - Pruebas: los consumidores se prueban con `{ provide: MailSender, useValue: doble }` (sin `jest.mock('resend')`); los tests de integración usan `overrideProvider(MailSender)`, lo que además evita construir el adaptador (que exige su API key). El adaptador se prueba aparte, con el SDK reemplazado.
  - Un puerto nuevo se agrega solo cuando hay un proveedor externo o un segundo implementador previsto.
- Specs de controller: `backend/test/controller-testing.ts` (`createControllerApp`) levanta el controller real con un guard JWT falso que fija `request.user`, para que `@CurrentUser()` y los guards de rol corran de verdad sin base de datos.
