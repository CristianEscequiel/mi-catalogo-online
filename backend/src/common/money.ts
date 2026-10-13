// Dinero en centavos enteros: evita el error de punto flotante (0.1 + 0.2). Las entradas salen de
// columnas numeric(12,2), así que ya tienen a lo sumo dos decimales; Math.round solo absorbe la
// imprecisión de representación (0.1 * 100). Con 12 dígitos el máximo (1e12 centavos) es seguro.
export const toCents = (amount: number): number => Math.round(amount * 100);

export const fromCents = (cents: number): number => cents / 100;

export const lineTotal = (unitPrice: number, quantity: number): number => fromCents(toCents(unitPrice) * quantity);

export const sumMoney = (amounts: number[]): number => fromCents(amounts.reduce((acc, amount) => acc + toCents(amount), 0));
