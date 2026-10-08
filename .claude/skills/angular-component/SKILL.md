---
name: angular-component
description: Convención del proyecto para crear o refactorizar componentes Angular 20 (standalone, OnPush, input()/output(), ubicación en features/ o shared/). Usar para la estructura TypeScript del componente. Para estilos y UX usar ui-ux-pro; para estado usar angular-signals; para APIs de Angular (forms, router, DI) usar angular-developer.
---

# Angular Component

Convención de componentes para este repo (Angular 20.3). Si algo choca con `angular-developer`, gana esta skill.

## Cuándo usar
- Crear o refactorizar un componente o una página.
- Migrar `@Input()`/`@Output()` a `input()`/`output()`.

No cubre: estilos y estados visuales (`ui-ux-pro`), estado reactivo (`angular-signals`), forms/router/DI (`angular-developer`).

## Reglas

- **Standalone siempre**, sin NgModules.
- **`changeDetection: ChangeDetectionStrategy.OnPush`** en todos los componentes.
- **`input()`, `output()`, `computed()`** en lugar de `@Input()`/`@Output()`. Inyección con `inject()`.
- Control de flujo del template con `@if`, `@for` (con `track`) y `@switch`.
- Componentes pequeños, una responsabilidad, sin lógica de negocio en el template. Si pasa de ~300 líneas, dividir.
- La lógica reutilizable va a un servicio o store, no al componente.
- Nada de manipulación manual del DOM.

## Dónde va

- Pantalla de negocio: `frontend/src/app/features/<dominio>/` (`<nombre>-page.ts` + `.html`).
- Componente reutilizable entre features: `frontend/src/app/shared/components/<nombre>/`.
- Transversal (layout, guards, interceptors): `core/`.
- Reutilizar antes de crear: `app-image-field`, `confirm-dialog`, `toast-container`.

## Ejemplo

```ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-card.html',
})
export class UserCard {
  name = input.required<string>();
  avatar = input<string>();
  selected = output<void>();

  isActive = computed(() => !!this.name());

  select() {
    this.selected.emit();
  }
}
```

## Accesibilidad mínima
HTML semántico, `alt` descriptivo, controles accesibles por teclado y ARIA solo cuando haga falta.

## Antipatrones
- Componentes con varias responsabilidades.
- Lógica de negocio en el template.
- `@Input()`/`@Output()` en código nuevo.

## Validación
Compilar con `npm run build` en `frontend/` al terminar.
