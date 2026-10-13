import { INestApplication, Provider, Type, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { Payload } from '../src/auth/models/payload.model';

// Levanta un controller real con sus guards de roles reales y el guard JWT reemplazado por uno que
// fija `request.user`. Así el decorador @CurrentUser() corre de verdad, sin base de datos ni JWT.
// `bypassGuards` deja pasar los guards indicados. Sin `user` el guard falso rechaza, igual que AuthGuard('jwt') sin token (401 en producción).
export async function createControllerApp(controller: Type, providers: Provider[], user?: Payload, bypassGuards: Type[] = []): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ controllers: [controller], providers })
    .overrideGuard(AuthGuard('jwt'))
    .useValue({
      canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user?: Payload } } }) => {
        if (!user) return false;
        ctx.switchToHttp().getRequest().user = user;
        return true;
      },
    });
  // Guards que necesitan infraestructura propia (por ejemplo, el límite de uso de la IA) se reemplazan por uno que deja pasar.
  for (const guard of bypassGuards) builder = builder.overrideGuard(guard).useValue({ canActivate: () => true });
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
