import { ExecutionContext } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { currentUserFactory, localUserFactory } from './current-user.decorator';

const ctxWith = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe('currentUserFactory', () => {
  it('devuelve el Payload que dejó el guard en el request', () => {
    const user = { sub: 7, role: 'CLIENT' as const };

    expect(currentUserFactory(undefined, ctxWith({ user }))).toBe(user);
  });

  it('devuelve undefined, sin lanzar, cuando el request no tiene usuario', () => {
    expect(currentUserFactory(undefined, ctxWith({}))).toBeUndefined();
  });
});

describe('localUserFactory', () => {
  it('REQ-1.2: devuelve el User que dejó AuthGuard("local") en el request', () => {
    const user = { id: 3, email: 'a@b.com' } as User;

    expect(localUserFactory(undefined, ctxWith({ user }))).toBe(user);
  });

  it('REQ-1.3: devuelve undefined, sin lanzar, cuando el request no tiene usuario', () => {
    expect(localUserFactory(undefined, ctxWith({}))).toBeUndefined();
  });
});
