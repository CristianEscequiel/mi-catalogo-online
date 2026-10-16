import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore, UserLite, UserProfile } from './auth.store';

const user: UserLite = { id: 7, email: 'ana@example.com', role: 'CLIENT' };
const profile: UserProfile = { id: 7, email: 'ana@example.com', name: 'Ana', lastName: 'Gómez', avatar: null };

function clearSessionKeys() {
  localStorage.removeItem('token');
  localStorage.removeItem('userLite');
}

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    clearSessionKeys();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => clearSessionKeys());

  describe('setAuth y clear', () => {
    it('REQ-1.1: setAuth guarda token y userLite en el store y en localStorage', () => {
      store.setAuth('jwt-1', user);

      expect(store.token()).toBe('jwt-1');
      expect(store.userLite()).toEqual(user);
      expect(store.isLoggedIn()).toBeTrue();
      expect(localStorage.getItem('token')).toBe('jwt-1');
      expect(JSON.parse(localStorage.getItem('userLite') as string)).toEqual(user);
    });

    it('REQ-1.8: clear borra token y userLite de localStorage', () => {
      store.setAuth('jwt-1', user);

      store.clear();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userLite')).toBeNull();
    });

    it('REQ-1.9: clear vacía token, usuario y perfil del store', () => {
      store.setAuth('jwt-1', user);
      store.setUserProfile(profile);

      store.clear();

      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
      expect(store.userProfile()).toBeNull();
      expect(store.isLoggedIn()).toBeFalse();
    });
  });

  describe('rehydrate', () => {
    it('REQ-1.3: con una sesión guardada válida restaura token y userLite', () => {
      localStorage.setItem('token', 'jwt-2');
      localStorage.setItem('userLite', JSON.stringify(user));

      store.rehydrate();

      expect(store.token()).toBe('jwt-2');
      expect(store.userLite()).toEqual(user);
      expect(store.isLoggedIn()).toBeTrue();
      expect(localStorage.getItem('token')).toBe('jwt-2');
    });

    it('REQ-1.5: con userLite que no es JSON arranca sin sesión y no lanza', () => {
      localStorage.setItem('token', 'jwt-2');
      localStorage.setItem('userLite', '{no es json');

      expect(() => store.rehydrate()).not.toThrow();

      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
    });

    it('REQ-1.6: con token pero sin userLite arranca sin sesión', () => {
      localStorage.setItem('token', 'jwt-2');

      store.rehydrate();

      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
    });

    it('REQ-1.6: con userLite pero sin token arranca sin sesión', () => {
      localStorage.setItem('userLite', JSON.stringify(user));

      store.rehydrate();

      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
    });

    it('REQ-1.6: con userLite sin id numérico arranca sin sesión', () => {
      localStorage.setItem('token', 'jwt-2');
      localStorage.setItem('userLite', JSON.stringify({ email: 'ana@example.com' }));

      store.rehydrate();

      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
    });

    it('REQ-1.7: con una sesión inválida borra ambas claves (JSON roto)', () => {
      localStorage.setItem('token', 'jwt-2');
      localStorage.setItem('userLite', '{no es json');

      store.rehydrate();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userLite')).toBeNull();
    });

    it('REQ-1.7: con una sesión inválida borra ambas claves (falta una)', () => {
      localStorage.setItem('token', 'jwt-2');

      store.rehydrate();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userLite')).toBeNull();
    });

    it('REQ-1.7: sin nada guardado no hay sesión y no falla', () => {
      expect(() => store.rehydrate()).not.toThrow();

      expect(store.isLoggedIn()).toBeFalse();
    });
  });
});
