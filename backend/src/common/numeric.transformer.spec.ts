import { numericTransformer } from './numeric.transformer';

describe('numericTransformer', () => {
  it('convierte el string de Postgres en number al leer (REQ-2.3)', () => {
    expect(numericTransformer.from('12.50')).toBe(12.5);
    expect(numericTransformer.from('0.00')).toBe(0);
  });

  it('respeta null y undefined al leer', () => {
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from(undefined)).toBeUndefined();
  });

  it('no altera el valor al escribir', () => {
    expect(numericTransformer.to(7.25)).toBe(7.25);
    expect(numericTransformer.to(null)).toBeNull();
  });
});
