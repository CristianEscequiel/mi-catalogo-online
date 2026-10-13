import { fromCents, lineTotal, sumMoney, toCents } from './money';

describe('money', () => {
  it('3 unidades a 0.10 suman 0.30 exacto (REQ-2.2)', () => {
    expect(0.1 * 3).not.toBe(0.3); // el problema que se resuelve
    expect(lineTotal(0.1, 3)).toBe(0.3);
  });

  it('0.1 + 0.2 da 0.3 exacto', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('una suma vacía es 0', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('conserva importes de 10 dígitos enteros y 2 decimales', () => {
    expect(sumMoney([9999999999.99, 0.01])).toBe(10000000000);
    expect(lineTotal(1234567890.12, 3)).toBe(3703703670.36);
  });

  it('toCents y fromCents son inversas para importes de dos decimales', () => {
    for (const amount of [0, 0.01, 0.07, 1.15, 19.99, 1234.56]) {
      expect(fromCents(toCents(amount))).toBe(amount);
    }
  });
});
