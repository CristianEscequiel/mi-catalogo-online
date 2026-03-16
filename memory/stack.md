---
name: project-stack
description: Define the technology stack, architecture, and conventions used in this repository.
triggers:
  - project stack
  - repository architecture
  - framework used
  - project conventions
---

# Project Stack Skill

This skill provides context about the **technology stack and architectural conventions** used in this repository.

The agent should use this information when:

- generating new features
- modifying existing code
- suggesting architecture improvements
- reviewing code

---

# Frontend Stack

Framework:

Angular v20+

Key Concepts:

- standalone components
- Angular signals
- OnPush change detection
- reactive UI patterns

UI Framework:

- Tailwind CSS
- DaisyUI components

Frontend architecture guidelines:

- small reusable components
- signals for state management
- minimal RxJS unless needed for async streams

---

# Backend Stack

Framework:

NestJS

Architecture:

- modular architecture
- controllers handle routing
- services handle business logic
- DTO validation using class-validator

Database access:

- TypeORM or repository pattern

API design:

- REST API
- DTO validation
- Swagger documentation

---

# Database

Database engine:

PostgreSQL

Guidelines:

- indexed columns for joins and filters
- avoid SELECT *
- optimize queries with EXPLAIN ANALYZE
- use migrations for schema changes

---

# Dev Environment

Package manager:

npm

Development tools:

- Docker for database
- local development environment

---

# Repository Conventions

Backend structure example:


src/
modules/
controllers/
services/
dto/
entities/


Frontend structure example:


components/
pages/
services/
state/


---

# Coding Principles

The agent should follow these principles:

- keep code modular
- avoid unnecessary dependencies
- maintain readability
- follow framework conventions
- prefer modern Angular and NestJS patterns

---

# Expected Behavior

When generating code the agent should:

- respect the stack defined in this file
- avoid introducing unrelated frameworks
- follow project architecture
- generate maintainable code

---