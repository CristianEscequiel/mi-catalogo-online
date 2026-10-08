# Specs (sdd-flow)

Planificación previa a escribir código, con la skill `/sdd-flow`. El código no se adelanta a la spec: si algo no contemplado aparece al implementar, se actualiza el documento y recién después se sigue.

Contexto de proyecto que lee el flujo: `steering/product.md`, `steering/tech.md`, `steering/structure.md`.

## Flujo completo — `specs/<nombre-feature>/`

Para features nuevas, cambios que tocan datos/permisos/integraciones o más de ~3 archivos. Se versiona.

1. `requirements.md` — contexto y decisiones, criterios en EARS (`CUANDO ... EL SISTEMA DEBERÁ ...`). Requiere aprobación.
2. `design.md` — componentes, diagramas Mermaid y trazabilidad a los `REQ-x`. Requiere aprobación.
3. `tasks.md` — tareas chicas con dependencias y verificación. Requiere aprobación.

Al terminar todas las tareas se recorre cada criterio de aceptación y se marca sí/no con evidencia. Una feature = una carpeta: los cambios posteriores son enmiendas de la misma spec.

## Flujo rápido (SDD-Lite) — `specs/rapidas/<nombre-cambio>/`

Para bugs simples y ajustes de 1-2 archivos. **No se versiona** (está en `.gitignore`).

- `spec.md` — pedido y criterios en EARS.
- `plan.md` — plan aprobado en Plan Mode.
- `notes.md` — log de resultados (solo se agregan entradas).

## Nombres
Carpetas en kebab-case y en castellano o inglés según el repo, por ejemplo `specs/checkout-mercadopago/` o `specs/rapidas/fix-stock-negativo/`.
