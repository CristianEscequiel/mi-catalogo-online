import { canModify } from './ownership';

describe('canModify', () => {
  it('deja pasar a un ADMIN sobre cualquier dueño, incluso sin dueño', () => {
    expect(canModify({ sub: 1, role: 'ADMIN' }, 99)).toBe(true);
    expect(canModify({ sub: 1, role: 'ADMIN' }, null)).toBe(true);
    expect(canModify({ sub: 1, role: 'ADMIN' }, undefined)).toBe(true);
  });

  it('deja pasar a un GUEST sobre lo suyo', () => {
    expect(canModify({ sub: 7, role: 'GUEST' }, 7)).toBe(true);
  });

  it('rechaza a un GUEST sobre lo de otro', () => {
    expect(canModify({ sub: 7, role: 'GUEST' }, 8)).toBe(false);
  });

  it('rechaza a un GUEST sobre un recurso sin dueño', () => {
    expect(canModify({ sub: 7, role: 'GUEST' }, null)).toBe(false);
    expect(canModify({ sub: 7, role: 'GUEST' }, undefined)).toBe(false);
  });

  it('solo evalúa propiedad: un CLIENT dueño pasa (el rol lo filtra RolesGuard)', () => {
    expect(canModify({ sub: 3, role: 'CLIENT' }, 3)).toBe(true);
  });
});
