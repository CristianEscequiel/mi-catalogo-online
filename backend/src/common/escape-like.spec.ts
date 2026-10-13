import { escapeLike } from './escape-like';

describe('escapeLike', () => {
  it('escapa % y _', () => {
    expect(escapeLike('50%')).toBe('50\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
  });

  it('escapa la barra invertida', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('deja el texto normal sin cambios', () => {
    expect(escapeLike('teclado')).toBe('teclado');
    expect(escapeLike('')).toBe('');
  });
});
