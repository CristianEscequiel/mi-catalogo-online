---
inclusion: always
---

# Stack tecnológico

Versiones tomadas de `frontend/package.json`, `backend/package.json` y los Dockerfiles.

## Frontend
- Angular 20.3 (standalone components, OnPush, signals), con SSR disponible (`serve:ssr:frontend`).
- Tailwind CSS 4 + DaisyUI 5; íconos con `@fortawesome/angular-fontawesome`.
- Estado: signals en stores/servicios (`core/state`); RxJS solo para streams async y HTTP.
- Formularios: Reactive Forms (Signal Forms requiere Angular 21, no usar).
- Tests: Karma + Jasmine (`ng test`).

## Backend
- NestJS 11, arquitectura modular, REST con Swagger (`@nestjs/swagger`).
- TypeORM 0.3 sobre PostgreSQL, con migraciones (`backend/src/database/migrations`, config en `src/database/ormconfig.ts`).
- Validación con `class-validator`; DTOs de actualización con `PartialType`.
- Auth: JWT + guard de roles (`auth/roles`).
- Archivos: Multer, módulo `files` (subidas a `uploads/`).
- IA: SDK `openai` en el módulo `ai`.
- Tests: Jest (unitarios y `test/jest-e2e.json`).

## Infraestructura
- Node 22 (imágenes `node:22-alpine`; frontend servido con `nginx:1.27-alpine`).
- Docker Compose para el stack completo; el backend corre `migrations:run:prod` al arrancar.
- Variables de entorno: ver `.env-example` (puertos, DB, `JWT_SECRET`, `CORS_ORIGIN`, `OPENAI_API_KEY`). Nunca editar `.env`.
- CI/CD en `.github/workflows/ci.yml`: detección de cambios por carpeta, build y tests, imágenes a GHCR y deploy por SSH (puerto 5068) al servidor.

## Convenciones de código
- Prettier en frontend (`printWidth: 100`, comillas simples); ESLint + Prettier en backend.
- Controllers delgados, lógica en services, validación en DTOs, acceso a datos vía repositorios TypeORM.
- Componentes pequeños y reutilizables; estado con signals.
- Ver skills en `.claude/skills/` y su precedencia en `CLAUDE.md`.

## Restricciones técnicas
- No introducir frameworks ni dependencias nuevas sin acordarlo.
- Cambios de esquema solo con migraciones, nunca `synchronize`.
- Estado actual de calidad: lint y varias suites de test (backend y frontend) fallan y están como `continue-on-error` en el CI; el build es bloqueante.
