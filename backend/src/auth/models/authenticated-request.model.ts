import type { Request } from 'express';
import { Payload } from './payload.model';

export interface AuthenticatedRequest extends Request {
  user: Payload;
}
