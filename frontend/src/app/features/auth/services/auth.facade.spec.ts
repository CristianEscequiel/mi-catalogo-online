import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthStore } from '../../../core/state/auth.store';
import { AuthFacade } from './auth.facade';

// Deja pasar los microtasks pendientes: tras `flush`, `firstValueFrom` resuelve y el facade pide lo siguiente.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('AuthFacade', () => {
  let service: AuthFacade;
  let store: AuthStore;
  let http: HttpTestingController;
  let router: { navigateByUrl: jasmine.Spy; navigate: jasmine.Spy };

  const loginUrl = `${API_BASE_URL}/auth/login`;
  const loginResponse = {
    access_token: 'jwt-1',
    user: { id: 7, email: 'ana@example.com', createdAt: '', updatedAt: '' },
  };
  const profileResponse = {
    id: 7,
    email: 'ana@example.com',
    createdAt: '',
    updatedAt: '',
    profile: { name: 'Ana', lastName: 'Gómez', avatar: null, createdAt: '', updatedAt: '' },
  };

  beforeEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
    spyOn(console, 'error');
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl'), navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthFacade);
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loginUser', () => {
    it('REQ-1.1: un login exitoso llama a AuthStore.setAuth con el token y el usuario de la respuesta, y es la única escritura de la sesión', async () => {
      const setAuth = spyOn(store, 'setAuth').and.callThrough();
      const setItem = spyOn(localStorage, 'setItem').and.callThrough();

      const result = service.loginUser('ana@example.com', 'secreto');
      http.expectOne(loginUrl).flush(loginResponse);
      await settle();
      http.expectOne(`${API_BASE_URL}/users/7`).flush(profileResponse);
      await result;

      expect(setAuth).toHaveBeenCalledOnceWith('jwt-1', loginResponse.user as never);
      const writtenKeys = setItem.calls.allArgs().map(([key]) => key);
      expect(writtenKeys).toEqual(['token', 'userLite']);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    });

    it('REQ-1.10: un login con credenciales inválidas (401) no deja sesión en el store ni en localStorage', async () => {
      const setAuth = spyOn(store, 'setAuth').and.callThrough();

      const result = service.loginUser('ana@example.com', 'mala');
      http.expectOne(loginUrl).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      await expectAsync(result).toBeRejectedWithError('LOGIN_FAILED');
      expect(setAuth).not.toHaveBeenCalled();
      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userLite')).toBeNull();
    });

    it('REQ-1.10: un login con error de red no deja sesión en el store ni en localStorage', async () => {
      const setAuth = spyOn(store, 'setAuth').and.callThrough();

      const result = service.loginUser('ana@example.com', 'secreto');
      http.expectOne(loginUrl).error(new ProgressEvent('error'));

      await expectAsync(result).toBeRejectedWithError('LOGIN_FAILED');
      expect(setAuth).not.toHaveBeenCalled();
      expect(store.token()).toBeNull();
      expect(store.userLite()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userLite')).toBeNull();
    });
  });
});
