export interface PositiveIntReading {
  value: number;
  // false cuando la variable estaba definida pero no era un entero positivo (se usó el valor por defecto)
  valid: boolean;
}

// Lee una variable de entorno numérica. Ausente → default sin advertencia; definida pero inválida → default con valid=false.
export const readPositiveInt = (raw: unknown, fallback: number): PositiveIntReading => {
  if (raw === undefined || raw === null) {
    return { value: fallback, valid: true };
  }
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return { value: parsed, valid: true };
  }
  return { value: fallback, valid: false };
};
