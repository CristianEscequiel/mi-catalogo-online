# Catálogo Online — instrucciones para Claude Code

Mini e-commerce full stack (Angular 20 + NestJS 11 + PostgreSQL), pensado como pieza de portfolio.
Responder y escribir documentación en castellano; el código y los identificadores siguen el idioma ya usado en el repo.

## Contexto del proyecto (siempre cargado)

@steering/product.md
@steering/tech.md
@steering/structure.md

## Reglas de operación

1. Analizar el pedido antes de tocar archivos y hacer el cambio mínimo y seguro.
2. Seguir la arquitectura existente (`steering/structure.md`). No introducir frameworks ni dependencias nuevas sin acordarlo.
3. No modificar archivos ajenos a la tarea.

## Seguridad

Nunca:

- exponer secretos ni modificar archivos `.env` (el único versionado es `.env-example`)
- ejecutar comandos destructivos (`docker compose down -v`, `git reset --hard`, `rm -rf`, `DROP`, etc.) sin confirmación
- borrar archivos sin confirmación

## Planificación (sdd-flow)

El código no se adelanta a la spec. Elegir el flujo según el tamaño del cambio:

| Pedido | Flujo |
|---|---|
| Typo, un valor, ajuste de una línea ya especificado | Directo, sin spec |
| Bug simple, ajuste de UI, 1-2 archivos | `/sdd-flow` rápido (SDD-Lite) → `specs/rapidas/<cambio>/` |
| Feature nueva, toca datos/permisos/integraciones, más de ~3 archivos | `/sdd-flow` completo → `specs/<feature>/` (requirements → design → tasks, con aprobación en cada fase) |

Si no es obvio cuál corresponde, preguntar. Más detalle en `specs/README.md`.
Si aparece algo no contemplado durante la implementación, parar y actualizar la spec antes de seguir.

## Skills del proyecto (`.claude/skills/`)

Cargar solo las necesarias. Si dos skills chocan, gana el orden: `steering/` > skill de convención del proyecto > skill de referencia genérica.

| Skill | Tipo | Cubre | Cede ante |
|---|---|---|---|
| `angular-component` | convención | estructura TS del componente (standalone, OnPush, `input()`/`output()`) y su ubicación | — |
| `angular-signals` | convención | estado reactivo con signals, servicios en `core/state` | — |
| `ui-ux-pro` | convención | aspecto y UX: Tailwind, DaisyUI, mobile-first, estados loading/empty/error | — |
| `angular-developer` | referencia | APIs de Angular (router, forms, DI, testing, SSR, aria) vía `references/` | las tres anteriores |
| `nestjs-api` | convención | crear endpoints: controller, service, DTO, Swagger, REST | — |
| `nestjs-best-practices` | convención | arquitectura, refactor, auth/guards/roles, testing, revisión | `nestjs-api` en el detalle de endpoints |
| `postgres-optimization` | convención | SQL, índices, migraciones TypeORM | — |

Elección rápida:

- Componente o pantalla nueva → `angular-component` + `ui-ux-pro`
- Estado, signals, RxJS → `angular-signals`
- Forms, router, DI, tests de Angular → `angular-developer` (con los overrides del proyecto)
- Endpoint o DTO nuevo → `nestjs-api`
- Refactor, auth, revisión de backend → `nestjs-best-practices`
- Consulta lenta, índice, migración → `postgres-optimization`

## Comandos

Backend (`cd backend`): `npm run start:dev` · `npm run build` · `npm test` · `npx eslint "{src,apps,libs,test}/**/*.ts"` · `npm run migrations:generate -- src/database/migrations/<Nombre>` · `npm run migrations:run`
Frontend (`cd frontend`): `npm start` · `npm run build` · `npx ng test --no-watch --browsers=ChromeHeadless`
Stack completo: `docker compose up -d --build` (requiere `.env` a partir de `.env-example`).

Estado conocido (ver `.github/workflows/ci.yml`): lint y tests están rotos en parte y no bloquean el CI; el build sí. Para validar un cambio: build + tests nuevos que pasen o verificación manual descrita en la spec. No "arreglar" los tests rotos fuera del alcance pedido.

## Validación

Al terminar: compilar la parte tocada (`npm run build` en `backend/` o `frontend/`) y, si hay spec, recorrer cada criterio de aceptación marcando sí/no con evidencia.
