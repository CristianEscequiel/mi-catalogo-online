import { INestApplication, ModuleMetadata, Provider, Type, UnauthorizedException, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { Payload } from '../src/auth/models/payload.model';

export interface ControllerAppOptions {
  // Módulos extra (por ejemplo ThrottlerModule.forRoot(...)) para guards reales que necesitan infraestructura.
  imports?: ModuleMetadata['imports'];
  // Por defecto, el ValidationPipe simple de siempre; los specs que lo necesiten pasan las opciones de producción (app.setup.ts).
  validationPipeOptions?: ValidationPipeOptions;
  // El guard falso lanza 401 en vez de devolver false (que Nest convierte en 403), como AuthGuard('jwt') sin token.
  rejectUnauthenticatedWith401?: boolean;
}

// Levanta un controller real con sus guards de roles reales y el guard JWT reemplazado por uno que
// fija `request.user`. Así el decorador @CurrentUser() corre de verdad, sin base de datos ni JWT.
// `bypassGuards` deja pasar los guards indicados. Sin `user` el guard falso rechaza (por defecto con false → 403; con `rejectUnauthenticatedWith401`, 401 como en producción).
export async function createControllerApp(controller: Type, providers: Provider[], user?: Payload, bypassGuards: Type[] = [], options: ControllerAppOptions = {}): Promise<INestApplication<App>> {
  const { imports = [], validationPipeOptions = { whitelist: true, forbidNonWhitelisted: true, transform: true }, rejectUnauthenticatedWith401 = false } = options;
  let builder = Test.createTestingModule({ imports, controllers: [controller], providers })
    .overrideGuard(AuthGuard('jwt'))
    .useValue({
      canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user?: Payload } } }) => {
        if (!user) {
          if (rejectUnauthenticatedWith401) throw new UnauthorizedException();
          return false;
        }
        ctx.switchToHttp().getRequest().user = user;
        return true;
      },
    });
  // Guards que necesitan infraestructura propia (por ejemplo, el límite de uso de la IA) se reemplazan por uno que deja pasar.
  for (const guard of bypassGuards) builder = builder.overrideGuard(guard).useValue({ canActivate: () => true });
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  await app.init();
  return app;
}
