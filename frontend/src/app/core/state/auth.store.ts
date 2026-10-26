// core/state/auth.store.ts
import { Injectable, signal, computed } from '@angular/core';

const USER_ROLES = ['ADMIN', 'CLIENT', 'GUEST'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export interface UserLite {
  id: number;
  email: string;
  role?: UserRole;
}
export interface UserProfile { id: number; email: string; name: string; lastName: string; avatar: string | null }

@Injectable({ providedIn: 'root' })
export class AuthStore {

  private _token = signal<string | null>(null);
  private _userLite = signal<UserLite | null>(null);
  private _userProfile = signal<UserProfile | null>(null);

  token = computed(() => this._token());
  userLite = computed(() => this._userLite());
  userProfile = computed(() => this._userProfile());
  isLoggedIn = computed(() => !!this._token());

  setAuth(token: string, user: UserLite) {
    this._token.set(token);
    this._userLite.set(user);

    localStorage.setItem('token', token);
    localStorage.setItem('userLite', JSON.stringify(user));
  }

  setUserProfile(profile: UserProfile) {
    this._userProfile.set(profile);
  }

  clear() {
    this._token.set(null);
    this._userLite.set(null);
    this._userProfile.set(null);
    this.removeStoredSession();
  }

  // Única lectura de localStorage de la sesión (spec frontend-cleanup, REQ-1).
  // Una sesión es válida si hay token (string no vacío) y userLite con un id numérico;
  // si no, se arranca sin sesión y se borran ambas claves, sin lanzar.
  rehydrate() {
    const token = localStorage.getItem('token');
    const rawUserLite = localStorage.getItem('userLite');
    const userLite = parseUserLite(rawUserLite);

    if (token && userLite) {
      this._token.set(token);
      this._userLite.set(userLite);
      return;
    }

    if (token !== null || rawUserLite !== null) {
      this.removeStoredSession();
    }
  }

  private removeStoredSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  }
}

function parseUserLite(raw: string | null): UserLite | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object') {
      const { id, role } = parsed as { id?: unknown; role?: unknown };
      // `role` es opcional, pero si viene tiene que ser uno conocido: el menú y las rutas de admin dependen de él.
      const validRole = role === undefined || USER_ROLES.includes(role as UserRole);
      if (typeof id === 'number' && validRole) {
        return parsed as UserLite;
      }
    }
  } catch {
    // JSON corrupto: se trata como sesión inválida.
  }
  return null;
}
