import * as crypto from 'crypto';

// El token en claro solo viaja por email; en la base se guarda su SHA-256 (64 hex, entra en varchar(64)).
export const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
