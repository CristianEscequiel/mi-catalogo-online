// core/state/auth.store.ts
import { Injectable, signal, computed, effect } from '@angular/core';

export interface UserLite { id: number; email: string; }
export interface UserProfile { id: number; email: string; name: string; lastName:string; avatar:string }

@Injectable({ providedIn: 'root' })
export class AuthStore {
  // estado
  private _token = signal<string | null>(null);
  private _userLite = signal<UserLite | null>(null);
  private _userProfile = signal<UserProfile | null>(null);
  private _loadingProfile = signal(false);

  // selectors
  token = computed(() => this._token());
  userLite = computed(() => this._userLite());
  userProfile = computed(() => this._userProfile());
  isLoggedIn = computed(() => !!this._token());

  // acciones
  setAuth(token: string, user: UserLite) {
    this._token.set(token);
    this._userLite.set(user);

    // persistir token para rehidratar
    localStorage.setItem('token', token);
    localStorage.setItem('userLite', JSON.stringify(user));
  }

  setUserProfile(profile: UserProfile) {
    this._userProfile.set(profile);
  }

  setLoadingProfile(v: boolean) { this._loadingProfile.set(v); }

  clear() {
    this._token.set(null);
    this._userLite.set(null);
    this._userProfile.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  }
}
