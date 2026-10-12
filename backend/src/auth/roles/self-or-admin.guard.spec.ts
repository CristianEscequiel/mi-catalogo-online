import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from './roles.enum';
import { SelfOrAdminGuard } from './self-or-admin.guard';

const ctxFor = (user: unknown, id: string) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user, params: { id } }) }) }) as unknown as ExecutionContext;

describe('SelfOrAdminGuard', () => {
  const guard = new SelfOrAdminGuard();

  it('deja pasar al propio usuario', () => {
    expect(guard.canActivate(ctxFor({ sub: 7, role: Role.CLIENT }, '7'))).toBe(true);
  });

  it('deja pasar a un ADMIN sobre cualquier id', () => {
    expect(guard.canActivate(ctxFor({ sub: 1, role: Role.ADMIN }, '7'))).toBe(true);
  });

  it('bloquea a otro usuario (IDOR)', () => {
    expect(() => guard.canActivate(ctxFor({ sub: 8, role: Role.CLIENT }, '7'))).toThrow(ForbiddenException);
  });

  it('bloquea a GUEST sobre otro id', () => {
    expect(() => guard.canActivate(ctxFor({ sub: 9, role: Role.GUEST }, '7'))).toThrow(ForbiddenException);
  });

  it('bloquea si no hay usuario en el request', () => {
    expect(() => guard.canActivate(ctxFor(undefined, '7'))).toThrow(ForbiddenException);
  });
});
