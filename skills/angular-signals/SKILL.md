---
name: angular-signals
description: Implement reactive state management using Angular Signals (signal, computed, effect) following Angular v20+ best practices.
triggers:
  - angular signals
  - state management
  - reactive state
  - convert rxjs to signals
  - computed state
  - signal store
---

# Angular Signals Skill

This skill guides the AI agent to implement **signal-based state management in Angular v20+ applications**.

Signals are Angular's reactive primitive for managing state and enabling fine-grained UI updates.  
They track dependencies automatically and update only the affected parts of the UI.

Use this skill when:

- implementing component state
- deriving reactive state
- converting RxJS patterns to signals
- building reactive UI logic
- managing local component state

---

# Core Concepts

Angular signals provide synchronous reactive state.

Signals notify consumers when values change and allow Angular to optimize rendering updates.

---

# Core APIs

## signal() — Writable State

Use `signal()` to store mutable state.

Example:

```ts
import { signal } from '@angular/core';

const count = signal(0);

console.log(count()); // read value

count.set(5);

count.update(v => v + 1);

Signals are accessed by calling them as functions.

computed() — Derived State

Use computed() to create state derived from other signals.

import { signal, computed } from '@angular/core';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);

Computed signals automatically update when dependencies change.

Example with filtering:

const items = signal<Item[]>([]);
const filter = signal('');

const filteredItems = computed(() => {
  const query = filter().toLowerCase();
  return items().filter(i =>
    i.name.toLowerCase().includes(query)
  );
});
effect() — Side Effects

Use effect() to react to signal changes.

Example:

import { effect } from '@angular/core';

effect(() => {
  console.log('count changed:', count());
});

Effects run automatically whenever a dependency signal changes.

Signal Patterns
Local Component State

Prefer signals for UI state instead of RxJS.

Example:

isOpen = signal(false);

toggle() {
  this.isOpen.update(v => !v);
}
Derived UI State

Use computed signals for derived values.

items = signal<Product[]>([]);

totalPrice = computed(() =>
  this.items().reduce((sum, p) => sum + p.price, 0)
);
Filtering State
search = signal('');

filteredProducts = computed(() => {
  const query = this.search().toLowerCase();

  return this.products().filter(p =>
    p.name.toLowerCase().includes(query)
  );
});
Best Practices

Prefer signals for:

component state

derived values

UI state

reactive logic

Prefer RxJS only for:

async streams

HTTP streams

websockets

Anti-Patterns

Avoid:

using signals for complex async flows

nested computed signals with heavy logic

mixing signals and RxJS unnecessarily

storing huge data structures in signals

Converting RxJS to Signals

Instead of:

private count$ = new BehaviorSubject(0);

Prefer:

count = signal(0);

Derived state:

doubleCount = computed(() => this.count() * 2);
Expected Output

When using this skill, the agent should generate:

signal-based state

computed derived values

minimal reactive logic

clear reactive patterns


---