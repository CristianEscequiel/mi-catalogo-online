---
name: angular-component
description: Create and refactor Angular components using modern Angular (v20+) practices such as standalone components, signals, and OnPush change detection.
triggers:
  - create angular component
  - generate component
  - angular UI
  - angular template
  - refactor component
  - angular standalone component
---

# Angular Component Skill

This skill helps the agent create or refactor Angular components following **modern Angular best practices (v20+)**.

Use this skill when the task involves:

- Creating Angular components
- Refactoring UI components
- Implementing templates
- Migrating components to signals
- Improving Angular component architecture

---

# Core Principles

## Standalone Components

Angular components should be **standalone**.

Do not rely on NgModules.

Example:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: `<p>Example component</p>`
})
export class ExampleComponent {}
```
# Change Detection

Always prefer optimized change detection.

changeDetection: ChangeDetectionStrategy.OnPush

# Benefits:

fewer re-renders

better performance

predictable updates

# Prefer Signals

Use Angular signals when possible.

# Prefer:

signal()
computed()
input()
output()

# Avoid legacy patterns when not necessary:

@Input()
@Output()

# Example Component
```ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from '@angular/core';

@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'user-card',
    '[class.active]': 'isActive()'
  },
  template: `
    <div class="flex items-center gap-2 p-4 rounded-lg shadow">
      <img [src]="avatar()" [alt]="name() + ' avatar'" class="w-10 h-10 rounded-full">

      <div class="flex flex-col">
        <span class="font-semibold">{{ name() }}</span>
      </div>

      <button (click)="selectUser()">
        Select
      </button>
    </div>
  `
})
export class UserCardComponent {

  name = input<string>();
  avatar = input<string>();

  selected = output<void>();

  isActive = computed(() => !!this.name());

  selectUser() {
    this.selected.emit();
  }

}
```

# Component Guidelines

## When creating components:

• Keep components small and focused
• One responsibility per component
• Extract reusable logic into services or signals
• Avoid complex template logic

## Recommended structure:

component
├ template
├ styles
└ logic

# Styling

Prefer utility-first styling (Tailwind if available).

# Example:

<div class="flex items-center gap-2 p-4 rounded-lg shadow">

Avoid deeply nested CSS.

# Accessibility

## Components should include:

semantic HTML

descriptive alt text

keyboard accessibility for buttons and links

ARIA attributes when necessary

Anti-Patterns

# Avoid:

components larger than ~300 lines

business logic inside templates

manual DOM manipulation

multiple responsibilities in one component

## Expected Output

When using this skill the agent should produce:

a clean Angular component

modern Angular syntax

signal-based inputs/outputs

optimized change detection


---