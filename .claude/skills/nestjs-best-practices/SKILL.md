---
name: nestjs-best-practices
description: Arquitectura y buenas prácticas del backend NestJS 11 de este proyecto - módulos, inyección de dependencias, autenticación JWT, guards y roles, seguridad, performance, testing y revisión de código. Usar para refactor, auth/autorización y revisar backend. Para crear controllers, DTOs o endpoints concretos usar nestjs-api.
---

# NestJS Best Practices

Criterios de arquitectura y calidad del backend. El detalle de cómo se arma un endpoint (controller, DTO, Swagger, REST) está en `nestjs-api` y no se repite acá.

## Cuándo usar
- Refactorizar o reorganizar módulos.
- Auth, guards y roles.
- Revisar o auditar código del backend.
- Escribir tests de services.

## Arquitectura

- **Un módulo por dominio.** `AppModule` solo importa módulos de feature; los controllers y providers viven en su módulo.
- **Inyección de dependencias siempre.** Nunca `new MyService()`. Los providers se declaran en el módulo y se exportan solo si otro módulo los necesita.
- **Capas:** controller → service → repositorio. No mezclar acceso a DB en controllers.
- **Sin dependencias circulares.** Si aparece una, extraer la lógica común a un módulo/servicio aparte antes de usar `forwardRef`.
- **Configuración:** variables de entorno tipadas (`env.model.ts`); no leer `process.env` suelto en los services.

## Seguridad

- Autenticación JWT con los guards y estrategias de `backend/src/auth`.
- Autorización por rol con `@Roles(...)` y `RolesGuard` (`ADMIN`, `CLIENT`, `GUEST`). Toda ruta de administración debe exigir rol.
- Validación de toda entrada (ver `nestjs-api`). No confiar en el cliente.
- No devolver campos sensibles (ej. hash de contraseña): usar `ClassSerializerInterceptor` y `@Exclude`.
- Subida de archivos: validar tipo y tamaño (ver `backend/src/files`).
- Nunca registrar ni exponer secretos.

## Performance
- Paginar listados y no cargar datasets grandes.
- Evitar consultas N+1; cargar relaciones de forma explícita.
- Detalle de SQL, índices y migraciones: `postgres-optimization`.

## Testing

- Unit tests de services con Jest, mockeando los repositorios.
- Los tests nuevos deben pasar. Hoy varias suites del backend están rotas (ver `CLAUDE.md`); no es parte de la tarea arreglarlas salvo que se pida.

```ts
describe('CategoryService', () => {
  it('lanza NotFoundException si no existe', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
```

## Antipatrones
- Dependencias circulares entre módulos.
- Excepciones sin manejar o `Error` genérico.
- Lógica de negocio en controllers.
- Rutas de admin sin guard de rol.

## Validación
`npm run build` en `backend/`. En revisiones, listar hallazgos por severidad con archivo y línea.
