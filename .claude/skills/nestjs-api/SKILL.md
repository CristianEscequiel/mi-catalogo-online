---
name: nestjs-api
description: Crear o modificar endpoints REST en NestJS 11 de este proyecto - controller, service, DTO con class-validator, Swagger y excepciones HTTP. Usar para CRUD y endpoints nuevos. Para arquitectura, refactor, auth/guards/roles o revisión de backend usar nestjs-best-practices; para consultas e índices usar postgres-optimization.
---

# NestJS API

Cómo se arma un endpoint en este repo. Esta skill es la dueña del detalle de controller/DTO/Swagger.

## Cuándo usar
- Crear un controller, service o DTO.
- Agregar o cambiar un endpoint REST.
- Documentar con Swagger.

No cubre: decisiones de arquitectura, auth, guards, testing (`nestjs-best-practices`), SQL e índices (`postgres-optimization`).

## Estructura de un módulo

Seguir los módulos existentes (`backend/src/product`, `cart`, `orders`):

```
<dominio>/
├ <dominio>.module.ts
├ controllers/ o <dominio>.controller.ts
├ services/ o <dominio>.service.ts
├ dto/        create-*.dto.ts, update-*.dto.ts
└ entities/   *.entity.ts
```

Registrar el módulo en `app.module.ts`.

## Reglas

- **Controllers delgados:** solo rutas, DTOs y delegación al service. Sin lógica de negocio ni acceso a DB.
- **Services:** lógica de negocio y repositorios TypeORM (`@InjectRepository`). `async/await`.
- **DTOs:** toda entrada se valida con `class-validator`. El `ValidationPipe` global ya está en `main.ts`.
- **DTOs de actualización:** `PartialType(CreateXDto)` importado de `@nestjs/swagger` (así se ven en la documentación), como en `product/dto/update-product.dto.ts`.
- **REST:** recursos en plural y verbos estándar.

```
GET    /resources
GET    /resources/:id
POST   /resources
PATCH  /resources/:id
DELETE /resources/:id
```

- **Errores:** excepciones de Nest (`NotFoundException`, `BadRequestException`, `ConflictException`), nunca `Error` genérico.
- **Swagger:** `@ApiTags` en el controller y `@ApiProperty` en los DTOs.
- **Rutas protegidas:** usar los guards existentes de `auth/` (ver `nestjs-best-practices` para los criterios).
- **Cambios de esquema:** crear entidad y migración (ver `postgres-optimization`).

## Ejemplo

```ts
@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }
}
```

```ts
export class CreateCategoryDto {
  @ApiProperty({ example: 'Remeras', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

## Antipatrones
- Lógica de negocio en el controller.
- Endpoints sin DTO ni validación.
- Dependencias circulares entre módulos.
- Services de más de ~400 líneas.

## Validación
`npm run build` en `backend/`. Probar el endpoint (Swagger o petición manual) y, si hay lógica nueva, agregar un test del service que pase.
