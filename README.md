# Catálogo Online / Mini E-Commerce

Aplicación full stack (Angular + Node.js) que implementa un flujo completo de catálogo de productos, carrito y autenticación básica de usuarios.

El objetivo del proyecto es mostrar:
- Frontend moderno en Angular con Tailwind CSS.
- Backend en Node.js (NestJS / Express style) con endpoints REST.
- Manejo de carrito por usuario autenticado.
- Panel sencillo de administración de productos y stock.
- Buenas prácticas de arquitectura, modularización y documentación.

Este proyecto está pensado como pieza de portfolio técnica y de producto.

---

## 🧩 Funcionalidades principales

### Catálogo público
- Listado de productos con imagen, precio y stock disponible.
- Búsqueda / filtro por nombre.
- Vista de detalle de cada producto.

### Carrito de compras
- Agregar productos al carrito.
- Editar cantidades desde el carrito.
- Ver subtotal y total.

### Autenticación
- Registro e inicio de sesión (JWT).
- Carrito asociado al usuario logueado.

### Administración básica
- Crear / editar productos.
- Actualizar stock.

---

## 🏗️ Arquitectura

El proyecto está dividido en dos aplicaciones dentro del mismo repo:

```text
/mi-catalogo-online
  /frontend  → Aplicación Angular 17 (standalone components + Tailwind)
  /backend   → API REST en Node/NestJS (auth, products, cart)
  /docs      → Documentación técnica (arquitectura, endpoints)
  README.md  → Este archivo
