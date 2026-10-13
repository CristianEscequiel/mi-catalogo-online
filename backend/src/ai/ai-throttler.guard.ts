import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Payload } from '../auth/models/payload.model';

export const AI_THROTTLER_NAME = 'ai';

// Limita las llamadas a OpenAI por usuario autenticado (no por IP) con un único contador para todos los
// endpoints que lo usan. Debe ir DESPUÉS de AuthGuard('jwt') y RolesGuard: si estos rechazan, no consume tope.
@Injectable()
export class AiThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user as Payload | undefined;
    // Defensa: tras AuthGuard siempre hay usuario; sin él se cae a la IP para no abrir un contador común.
    return Promise.resolve(user?.sub !== undefined ? `user:${user.sub}` : `ip:${String(req.ip)}`);
  }

  // Sin clase ni handler en la clave: así generate-ai y generate-from-image comparten contador.
  protected generateKey(_context: ExecutionContext, tracker: string, throttlerName: string): string {
    return `ai:${throttlerName}:${tracker}`;
  }
}
