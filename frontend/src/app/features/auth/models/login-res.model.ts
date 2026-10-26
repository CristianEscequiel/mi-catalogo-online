import { UserRole } from '../../../core/state/auth.store';

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
  };
  access_token: string;
}
