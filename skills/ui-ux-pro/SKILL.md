---
name: ui-ux-pro
description: UI/UX design intelligence for Angular + Tailwind apps. Generates clean, responsive and production-ready interfaces using best practices.
---

# UI UX PRO (Angular + Tailwind)

## Cuándo usar esta skill
- diseño de componentes
- páginas (dashboard, catálogo, forms)
- mejoras de UI existentes
- problemas responsive
- UX (usabilidad, feedback, estados)

---

## Stack objetivo
- Angular (standalone + signals)
- Tailwind CSS
- DaisyUI (opcional)

---

## Reglas de UI (OBLIGATORIAS)

### 1. Mobile First
- diseñar primero para mobile
- luego escalar a md, lg, xl
- nunca romper layout en <640px

---

### 2. Layout limpio
- usar flex / grid
- evitar posiciones absolutas innecesarias
- evitar overflow horizontal

---

### 3. Espaciado consistente
- usar sistema:
  - gap-2 / gap-4 / gap-6
  - p-2 / p-4 / p-6
- NO valores arbitrarios

---

### 4. Jerarquía visual
- títulos claros (`text-xl`, `text-2xl`)
- subtítulos (`text-sm`, `text-base`)
- separar bloques con spacing

---

### 5. Botones y acciones
- CTA principal destacado
- hover + focus states
- disabled states visibles

---

### 6. Feedback UX (MUY IMPORTANTE)
Siempre incluir:
- loading (spinners o skeleton)
- empty state
- error state

---

### 7. Formularios
- labels visibles (no solo placeholders)
- validación clara
- botón deshabilitado si no es válido

---

### 8. Tablas / listas
- en mobile → cards (NO tabla)
- en desktop → tabla ok

---

### 9. Accesibilidad básica
- botones accesibles
- inputs con label
- contraste suficiente

---

## Anti-patterns (PROHIBIDO)

- ❌ overflow horizontal
- ❌ botones sin feedback
- ❌ formularios sin validación
- ❌ usar solo placeholder sin label
- ❌ layouts rotos en mobile
- ❌ UI sin estados (loading/error)

---

## Decisiones inteligentes (core de la skill)

Cuando el usuario pide algo:

### Detectar tipo de pantalla
- dashboard → grid + cards
- form → vertical + spacing
- catálogo → cards responsive
- admin → tabla + filtros

---

### Elegir layout automáticamente
- mobile → 1 columna
- tablet → 2 columnas
- desktop → 3+ columnas

---

### Elegir componentes
- listas → cards
- acciones → botones claros
- filtros → inputs compactos

---

## Output esperado

Siempre generar:
- HTML limpio (Angular template)
- clases Tailwind correctas
- responsive listo
- UX completo (no solo UI)

---

## Ejemplo de uso

"crear vista de productos con Angular, responsive y UX correcto"

---

## Resultado esperado

- lista en cards mobile
- grid en desktop
- botones claros
- loading + empty state
- diseño limpio y usable