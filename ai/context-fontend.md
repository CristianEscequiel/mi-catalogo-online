# Frontend Context (Angular 20)

## Tech stack
- Angular 20 standalone components
- Tailwind CSS
- HttpClient para consumir la API REST
- Estado de carrito en CartService
- Routing con app.routes.ts

## Páginas principales
- /products → ProductsListPage
- /cart → CartPage

## Componentes compartidos
- HeaderComponent
  - Muestra el total del carrito
  - Incluye buscador

## Servicios previstos
- ProductsService
  - getProducts(): GET /products
  - getProductById(id): GET /products/:id

- CartService
  - addToCart(productId, qty)
  - updateQty(productId, qty)
  - getCart()

- AuthService
  - login(), register()
  - guarda token JWT para usarlo en las requests protegidas
