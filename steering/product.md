---
inclusion: always
---

# Producto

## Qué es
Mini e-commerce full stack: catálogo de productos, carrito, favoritos, órdenes/checkout y autenticación. Pieza de portfolio técnico que busca mostrar un producto completo de punta a punta.

## Usuarios objetivo
- **Cliente:** explora el catálogo, arma carrito, marca favoritos, se autentica y genera órdenes.
- **Administrador:** gestiona productos, categorías y stock.
Roles en el backend: `ADMIN`, `CLIENT`, `GUEST` (`backend/src/auth/roles/roles.enum.ts`).

## Objetivos de negocio / del proyecto
- Portfolio: demostrar Angular moderno (signals, standalone), NestJS modular y PostgreSQL.
- Usar IA para asistir el desarrollo (Claude Code + sdd-flow) y como funcionalidad (módulo `ai` con OpenAI).
<!-- TODO: indicar si hay cliente real o dominio productivo (el CI hace deploy a producción por SSH). -->

## Features clave
- Catálogo público con imagen, precio, stock, búsqueda y filtrado; detalle de producto.
- Carrito persistente por usuario autenticado.
- Favoritos (wishlist) persistidos en base de datos.
- Registro, login con JWT y acceso por rol.
- Panel de administración de productos y categorías (crear, editar, stock).
- Checkout y órdenes.
- Subida/borrado de imágenes (productos, categorías, perfil): 1 imagen por entidad.
- Perfil de usuario y envío de mails.
- Módulo de IA (OpenAI) en el backend.

## Fuera de alcance
<!-- TODO: completar (por ejemplo pagos reales, multi-tienda, múltiples imágenes por entidad). Hoy se asume que no hay pasarela de pago real ni más de 1 imagen por entidad. -->
