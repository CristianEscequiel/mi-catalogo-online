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