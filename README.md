# 🛒 Catálogo Online / Mini E-Commerce

Aplicación **Full Stack (Angular + NestJS + PostgreSQL)** que implementa un flujo completo de **catálogo de productos, carrito de compras, favoritos y autenticación de usuarios**.

El objetivo del proyecto es demostrar:

- Desarrollo **Frontend moderno con Angular 20**
- **API REST escalable con NestJS**
- Gestión de estado reactivo con **Angular Signals**
- Persistencia con **PostgreSQL**
- Arquitectura modular y buenas prácticas de backend
- Integración de **IA para asistir el desarrollo**

Este proyecto está pensado como **pieza de portfolio técnico** que muestra capacidades reales de desarrollo **full stack moderno**.

---

# 🚀 Demo del sistema

El proyecto implementa un flujo completo de e-commerce simplificado:

1. Explorar catálogo de productos  
2. Agregar productos al carrito  
3. Marcar productos como favoritos ❤️  
4. Autenticarse para persistir carrito y favoritos  
5. Administrar productos y stock  

---

# ✨ Funcionalidades principales

## 🛍️ Catálogo público

- Listado de productos con **imagen, precio y stock**
- Búsqueda y filtrado por nombre
- Vista de detalle de producto
- Estado reactivo en frontend

---

## 🛒 Carrito de compras

- Agregar productos al carrito
- Editar cantidades
- Visualizar subtotal y total
- Carrito persistente por usuario autenticado

---

## ❤️ Favoritos (Wishlist)

Permite guardar productos favoritos para revisarlos luego.

- Botón ❤️ en tarjetas de producto
- Lista personal de favoritos
- Persistencia en base de datos
- Estado reactivo con **Angular Signals**

---

## 🔐 Autenticación

- Registro e inicio de sesión
- Autenticación mediante **JWT**
- Acceso a carrito y favoritos por usuario

---

## 🧑‍💻 Administración básica

Panel simple para gestionar productos:

- Crear productos
- Editar productos
- Actualizar stock

---

# 🤖 Desarrollo asistido por IA

Este proyecto integra un **asistente de desarrollo basado en IA (OpenAI Codex CLI)** para mejorar el flujo de desarrollo.

El agente tiene contexto del proyecto y puede:

- Analizar errores y proponer soluciones
- Generar scaffolding consistente
- Crear endpoints y componentes
- Proponer optimizaciones SQL
- Mantener coherencia arquitectónica

La arquitectura del agente se basa en:
AGENTS.md
skills/
memory/


---

## 🧠 Skills del agente

El agente utiliza habilidades especializadas para entender el proyecto:


/skills
angular-component
angular-signals
nestjs-api
nestjs-best-practices
postgres-optimization


Esto permite que el agente entienda correctamente:

- UI Angular
- Estado reactivo con Signals
- Arquitectura NestJS
- Optimización de consultas PostgreSQL

---

## 🧠 Contexto persistente del proyecto

El agente también utiliza memoria estructurada del repositorio:


/memory
stack.md
architecture.md
patterns.md


Esto le permite:

- respetar la arquitectura del proyecto
- seguir patrones de código existentes
- generar código consistente con el repo

---

# 🏗️ Arquitectura del proyecto

El repositorio contiene **frontend y backend en un mismo workspace**.


/mi-catalogo-online
/frontend → Angular 20 + Tailwind + Signals
/backend → NestJS REST API (auth, products, cart, favorites)
/skills → Skills utilizadas por el agente IA
/memory → Contexto del proyecto para el agente
/docs → Documentación técnica
README.md


---

# 🧩 Arquitectura Backend

Arquitectura modular en **NestJS**:


modules/
auth
products
cart
favorites


Responsabilidades:

- **Controllers** → endpoints REST
- **Services** → lógica de negocio
- **DTOs** → validación de datos
- **Entities** → modelos de base de datos

---

# 🎨 Arquitectura Frontend

Aplicación Angular moderna utilizando:

- **Standalone Components**
- **Angular Signals** para estado
- **Tailwind CSS + DaisyUI**

Estructura típica:


components/
pages/
services/
state/
models/


---

# 🧰 Stack tecnológico

## Frontend

- Angular 20
- Angular Signals
- Tailwind CSS
- DaisyUI

## Backend

- NestJS
- JWT Authentication
- REST API

## Base de datos

- PostgreSQL

## Herramientas

- Docker (base de datos en desarrollo)
- OpenAI Codex CLI (asistente de desarrollo)

---

# 🎯 Objetivo del proyecto

Este proyecto demuestra:

- Desarrollo **full stack moderno**
- Diseño de **arquitecturas escalables**
- Uso de **IA para mejorar productividad en desarrollo**
- Capacidad de construir **productos completos de principio a fin**

---

# 📌 Autor

**Cristian Escequiel**

Desarrollador Full Stack  
Angular • NestJS • PostgreSQL

GitHub:  
https://github.com/CristianEscequiel

---

# Docker (producción)

## Requisitos

- Docker
- Docker Compose

## Configuración

1. Crear archivo de entorno desde el ejemplo:

```bash
cp .env.example .env
```

2. Ajustar valores sensibles en `.env`:

- `DB_PASSWORD`
- `JWT_SECRET`
- `OPENAI_API_KEY` (si aplica)
- `CORS_ORIGIN`

## Levantar stack completo

```bash
docker compose up -d --build
```

Servicios:

- Frontend: `http://localhost:${FRONTEND_PORT}`
- Backend: `http://localhost:${BACKEND_PORT}`
- DB PostgreSQL con volumen persistente `postgres_data`

## Persistencia

- La base usa volumen nombrado `postgres_data`.
- `docker compose down` no elimina datos.
- Para borrar datos explícitamente: `docker compose down -v`.

---

# Gestión de imágenes (NestJS + Angular)

Se implementó soporte completo de subida, visualización y eliminación para:

- Productos (`thumbnailUrl`)
- Categorías (`imageUrl`)
- Perfil (`avatar`)

## Flujo en backend

1. El frontend envía `multipart/form-data` con el campo `file`.
2. NestJS usa `FileInterceptor` (Multer) para validar y guardar.
3. El archivo se guarda en `uploads/{products|categories|profiles}`.
4. Se persiste en DB una ruta pública relativa: `/uploads/<folder>/<filename>`.
5. El backend sirve estáticos bajo `/uploads`.

### ¿Qué hace Multer aquí?

- Procesa formularios `multipart/form-data`.
- Valida tipo MIME permitido (`jpg`, `jpeg`, `png`, `webp`).
- Limita tamaño máximo (`MAX_IMAGE_SIZE_BYTES`, default 5MB).
- Guarda físicamente el archivo en disco (`diskStorage`).

## Endpoints de imágenes

- `POST /products/:id/image`
- `DELETE /products/:id/image`
- `POST /categories/:id/image`
- `DELETE /categories/:id/image`
- `POST /users/:id/profile/image`
- `DELETE /users/:id/profile/image`

Regla funcional actual: 1 imagen por entidad.
Si ya existe imagen, el backend bloquea nueva subida hasta eliminar la actual.

## Servicio estático y URL

- Nest expone `uploads` como contenido estático en `/uploads`.
- La DB guarda rutas relativas para evitar hardcodear hosts.
- El frontend resuelve la URL final con configuración central (`API_BASE_URL`) mediante `resolveImageUrl(...)`.

Esto permite funcionar tanto en local (`http://localhost:3000/uploads/...`) como con proxy (`/api/uploads/...`).

## Eliminación de imagen

Cuando se elimina una imagen:

1. Se borra archivo físico en disco.
2. Se limpia referencia en DB (`null`).

## Conexión con frontend

- Se creó componente reutilizable: `app-image-field`.
- Se reutiliza en formularios de producto, categoría y perfil.
- Soporta: selección, preview, subida, eliminación, loading, errores.
- Mantiene la restricción actual de 1 imagen.

## Persistencia con Docker

El backend ya está listo para volumen de imágenes:

```yaml
backend:
  volumes:
    - uploads_data:/app/uploads

volumes:
  uploads_data:
```

Con ese volumen, los archivos sobreviven reinicios/redeploys del contenedor.

## Decisiones y escalabilidad futura (hasta 3 imágenes)

- Se centralizó la lógica de archivos en `backend/src/files`.
- Se separó upload/delete por entidad con rutas consistentes.
- En frontend, `app-image-field` ya expone `maxImages` para evolucionar a múltiples.
- Para pasar a 3 imágenes, la evolución natural es cambiar columnas simples por tabla de imágenes por entidad (sin rehacer endpoints base, solo ampliarlos a colección).
