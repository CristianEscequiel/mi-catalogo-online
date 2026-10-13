import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Payload } from './models/payload.model';

// Entrega el Payload que dejó el guard JWT en el request. Autenticar sigue siendo trabajo del guard:
// en una ruta sin AuthGuard('jwt') devuelve undefined en lugar de lanzar.
export const currentUserFactory = (_data: unknown, ctx: ExecutionContext): Payload | undefined => ctx.switchToHttp().getRequest<{ user?: Payload }>().user;

export const CurrentUser = createParamDecorator(currentUserFactory);
