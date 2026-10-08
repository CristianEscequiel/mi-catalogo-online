---
name: angular-signals
description: Convención del proyecto para estado reactivo en Angular 20 con signal(), computed() y effect(), stores en core/state y cuándo usar RxJS. Usar al implementar o migrar estado. Para linkedSignal o resource usar angular-developer; para la estructura del componente usar angular-component.
---

# Angular Signals

Convención de estado reactivo del proyecto. Si algo choca con `angular-developer`, gana esta skill.

## Cuándo usar
- Estado local de un componente o estado compartido (carrito, favoritos, auth).
- Valores derivados y filtros.
- Migrar `BehaviorSubject` a signals.

No cubre: `linkedSignal`, `resource` ni detalles de reactive context (ver `angular-developer`, `references/signals-overview.md`, `linked-signal.md`, `resource.md`).

## Reglas

- Estado local → `signal()`. Derivado → `computed()`. Efectos secundarios → `effect()`, solo si no hay alternativa.
- Estado compartido entre pantallas → store en `frontend/src/app/core/state/` (ver `auth.store.ts`, `cart.store.ts`, `favorites.store.ts`) y seguir ese patrón.
- RxJS solo para HTTP y streams async. Convertir al borde del store, no mezclar en el template.
- Exponer el estado como lectura (`asReadonly()`) y mutarlo solo desde métodos del store.
- Para actualizar usar `set()` o `update()`; nunca mutar el objeto dentro del signal.

## Ejemplos

```ts
// Estado local y derivado
items = signal<Product[]>([]);
search = signal('');
filtered = computed(() => {
  const q = this.search().toLowerCase();
  return this.items().filter((p) => p.name.toLowerCase().includes(q));
});
total = computed(() => this.items().reduce((sum, p) => sum + p.price, 0));
```

```ts
// Migración
// Antes
private count$ = new BehaviorSubject(0);
// Después
count = signal(0);
double = computed(() => this.count() * 2);
```

## Antipatrones
- Signals para flujos async complejos.
- `computed` anidados con lógica pesada.
- Guardar estructuras enormes en un signal.
- Mezclar signals y RxJS sin necesidad.
- Usar `effect()` para sincronizar estado que se puede derivar con `computed()`.

## Validación
`npm run build` en `frontend/`. Si cambió un store, revisar los componentes que lo consumen.
