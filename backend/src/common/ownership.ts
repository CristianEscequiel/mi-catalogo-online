import { Payload } from '../auth/models/payload.model';

// Un ADMIN modifica cualquier recurso; el resto, solo los que creó. Un recurso sin dueño
// (p. ej. categorías antiguas con user_id nulo) solo lo modifica un ADMIN.
export const canModify = (actor: Pick<Payload, 'sub' | 'role'>, ownerId: number | null | undefined): boolean => actor.role === 'ADMIN' || (ownerId != null && ownerId === actor.sub);
