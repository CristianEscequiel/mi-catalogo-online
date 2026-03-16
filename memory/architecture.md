# Project Architecture

This document describes the architecture of this repository.

The AI agent should read this file when understanding the structure of the project or making architectural decisions.

---

# Architecture Overview

The application follows a **frontend + backend architecture**:

Frontend:
Angular application responsible for UI, user interactions, and client state.

Backend:
NestJS API responsible for business logic, authentication, and data persistence.

Database:
PostgreSQL used for relational data storage.

---

# Frontend Architecture

Framework:
Angular v20+

Key principles:

- standalone components
- signal-based state management
- OnPush change detection
- reusable UI components

UI stack:

- Tailwind CSS
- DaisyUI

Typical structure:


src/
components/
pages/
services/
state/
models/


# Responsibilities:

Components  
Handle UI rendering and interactions.

Services  
Handle API communication and business logic.

Signals / State  
Manage local UI state and derived values.

---

# Backend Architecture

Framework:
NestJS

Backend follows **modular architecture**.

Each domain feature has its own module.

Typical module structure:


module/
├ controller
├ service
├ dto
├ entity
└ module


Responsibilities:

Controllers  
Handle HTTP requests and responses.

Services  
Contain business logic.

DTOs  
Validate incoming data.

Entities  
Define database models.

Modules  
Group related features.

---

# API Architecture

API follows REST conventions.

Typical endpoints:


GET /resources
GET /resources/:id
POST /resources
PATCH /resources/:id
DELETE /resources/:id


All inputs must be validated using DTOs.

Swagger documentation is used for API descriptions.

---

# Database Architecture

Database:
PostgreSQL

Database guidelines:

- normalized relational schema
- indexed join columns
- optimized queries
- migrations for schema changes

Database access occurs through repositories or ORM layers.

---

# Application Layers

The system is structured in layers:


Frontend (Angular)
↓
API Layer (NestJS Controllers)
↓
Business Logic (NestJS Services)
↓
Persistence Layer (Database)


Each layer should have a clear responsibility.

---

# Design Principles

The project follows these principles:

- modular architecture
- separation of concerns
- clean code practices
- scalable API design
- optimized database queries

---

# Agent Guidelines

When generating or modifying code the AI agent must:

- respect the architecture described here
- keep controllers thin
- keep components small and reusable
- avoid mixing frontend and backend responsibilities
- avoid introducing unrelated frameworks

---