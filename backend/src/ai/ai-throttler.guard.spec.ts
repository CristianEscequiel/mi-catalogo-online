import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerException, ThrottlerModule } from '@nestjs/throttler';
import { AI_THROTTLER_NAME, AiThrottlerGuard } from './ai-throttler.guard';

class FirstController {
  generateAi() {}
}
class SecondController {
  generateFromImage() {}
}

const contextFor = (user: object | undefined, controller: new () => object, handler: string): ExecutionContext => {
  const request = { user, ip: '10.0.0.1', headers: {} };
  const response = { header: jest.fn(), setHeader: jest.fn() };
  return {
    getClass: () => controller,
    getHandler: () => (controller.prototype as Record<string, () => void>)[handler],
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
};

describe('AiThrottlerGuard', () => {
  let guard: AiThrottlerGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ name: AI_THROTTLER_NAME, ttl: 60_000, limit: 3 }], errorMessage: 'Límite de IA' })],
      providers: [AiThrottlerGuard],
    }).compile();
    await moduleRef.init();
    guard = moduleRef.get(AiThrottlerGuard);
  });

  it('el tracker es el id del usuario, no la IP (REQ-5.3)', async () => {
    const tracker = await (guard as unknown as { getTracker(req: object): Promise<string> }).getTracker({ user: { sub: 42, role: 'GUEST' }, ip: '1.2.3.4' });
    expect(tracker).toBe('user:42');
  });

  it('comparte un único contador entre los dos handlers del mismo usuario (REQ-5.3)', async () => {
    const user = { sub: 1, role: 'GUEST' };

    expect(await guard.canActivate(contextFor(user, FirstController, 'generateAi'))).toBe(true);
    expect(await guard.canActivate(contextFor(user, SecondController, 'generateFromImage'))).toBe(true);
    expect(await guard.canActivate(contextFor(user, FirstController, 'generateAi'))).toBe(true);

    // la cuarta llamada supera el límite de 3, sin importar por cuál de los dos endpoints entre
    await expect(guard.canActivate(contextFor(user, SecondController, 'generateFromImage'))).rejects.toBeInstanceOf(ThrottlerException);
  });

  it('el rechazo lleva el mensaje configurado (REQ-5.2)', async () => {
    const user = { sub: 2, role: 'GUEST' };
    for (let i = 0; i < 3; i++) {
      await guard.canActivate(contextFor(user, FirstController, 'generateAi'));
    }

    await expect(guard.canActivate(contextFor(user, FirstController, 'generateAi'))).rejects.toThrow('Límite de IA');
  });

  it('agotar el tope de un usuario no afecta a otro (REQ-5.4)', async () => {
    const heavy = { sub: 3, role: 'GUEST' };
    for (let i = 0; i < 3; i++) {
      await guard.canActivate(contextFor(heavy, FirstController, 'generateAi'));
    }
    await expect(guard.canActivate(contextFor(heavy, FirstController, 'generateAi'))).rejects.toBeInstanceOf(ThrottlerException);

    expect(await guard.canActivate(contextFor({ sub: 4, role: 'GUEST' }, FirstController, 'generateAi'))).toBe(true);
  });
});
