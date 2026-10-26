import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Payload } from './models/payload.model';
import { User } from '../users/entities/user.entity';

// Entrega el Payload que dejó el guard JWT en el request. Autenticar sigue siendo trabajo del guard:
// en una ruta sin AuthGuard('jwt') devuelve undefined en lugar de lanzar.
export const currentUserFactory = (_data: unknown, ctx: ExecutionContext): Payload | undefined => ctx.switchToHttp().getRequest<{ user?: Payload }>().user;

export const CurrentUser = createParamDecorator(currentUserFactory);

// Solo para el login: AuthGuard('local') deja en el request la entidad User ya validada (no un Payload).
export const localUserFactory = (_data: unknown, ctx: ExecutionContext): User | undefined => ctx.switchToHttp().getRequest<{ user?: User }>().user;

export const LocalUser = createParamDecorator(localUserFactory);
