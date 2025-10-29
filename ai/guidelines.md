# Development Workflow with AI Assistant

## Objetivo
Usar el asistente IA como copiloto técnico para acelerar desarrollo y debugging, manteniendo control humano sobre las decisiones.

## Cuándo lo uso
1. **Debug rápido**
   - Le paso un log de error (por ejemplo, NestJS "Cannot resolve dependency").
   - Le pido: "explicame la causa raíz y dame el fix mínimo SIN romper lo que ya hay".

2. **Generar boilerplate**
   - Ejemplo: crear un nuevo módulo NestJS `orders` con controller/service/model.
   - Ejemplo: crear un nuevo componente Angular standalone con inputs + HTML básico.

3. **Documentar**
   - Le pido: "creame entrada para docs/endpoints.md para este nuevo endpoint POST /checkout".

## Cómo mantener consistencia
- El asistente debe respetar la estructura de carpetas actual.
- El asistente debe generar código en inglés (nombres de clases, servicios).
- Comentarios y documentación pueden estar en español técnico.
- Cualquier cambio que afecte seguridad (auth.guard, jwt.guard) se revisa manualmente antes de commitear.
