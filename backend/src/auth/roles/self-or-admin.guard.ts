import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Payload } from '../models/payload.model';
import { Role } from './roles.enum';

// Deja pasar al ADMIN o al usuario autenticado cuyo `sub` coincide con el parámetro de ruta `:id`.
// Debe usarse después de AuthGuard('jwt').
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ user?: Payload; params: Record<string, string> }>();
    const user = req.user;
    if (user && ((user.role as Role) === Role.ADMIN || String(user.sub) === req.params.id)) {
      return true;
    }
    throw new ForbiddenException('No tenés permiso para acceder a este recurso');
  }
}
