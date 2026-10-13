import { readPositiveInt } from './ai-rate-limit.config';

describe('readPositiveInt', () => {
  it('usa el default sin advertencia cuando la variable no está definida', () => {
    expect(readPositiveInt(undefined, 20)).toEqual({ value: 20, valid: true });
    expect(readPositiveInt(null, 20)).toEqual({ value: 20, valid: true });
  });

  it('acepta enteros positivos como número o texto', () => {
    expect(readPositiveInt('30', 20)).toEqual({ value: 30, valid: true });
    expect(readPositiveInt(30, 20)).toEqual({ value: 30, valid: true });
  });

  it.each(['0', '-5', 'abc', '2.5', '', ' ', NaN, 0, -1, 2.5, {}])('usa el default y marca inválido con %p', (raw) => {
    expect(readPositiveInt(raw, 20)).toEqual({ value: 20, valid: false });
  });
});
