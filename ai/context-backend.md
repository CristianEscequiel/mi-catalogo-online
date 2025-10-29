# Backend Context (NestJS)

## Módulos
- products/
  - products.controller.ts
  - products.service.ts
  - products.model.ts
  - Endpoints:
    - GET /products
    - GET /products/:id
    - POST /products (admin scope futuro)

- auth/
  - auth.controller.ts
  - auth.service.ts
  - user.model.ts
  - jwt.guard.ts
  - Endpoints:
    - POST /auth/register
    - POST /auth/login
  - Devuelve JWT

- cart/
  - cart.controller.ts
  - cart.service.ts
  - Endpoints:
    - GET /cart
    - POST /cart/add
    - PUT /cart/update
  - Requiere JWT (userId asociado)

## Reglas
- Carrito se guarda por userId.
- Stock vive en products.service (por ahora memoria).
- Rutas sensibles usan jwt.guard.ts.
- Las respuestas JSON tienen que ser limpias y consumibles por Angular.
