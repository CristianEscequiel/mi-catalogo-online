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

  describe('hydrate', () => {
    const user = { id: 7, email: 'ana@example.com', role: 'CLIENT' as const };
    const profileUrl = `${API_BASE_URL}/users/7`;

    it('REQ-1.3: no lee localStorage; toma la sesión que ya restauró el AuthStore', async () => {
      store.setAuth('jwt-1', user);
      const getItem = spyOn(localStorage, 'getItem').and.callThrough();

      const result = service.hydrate();
      http.expectOne(profileUrl).flush(profileResponse);
      await result;

      expect(getItem).not.toHaveBeenCalled();
    });

    it('REQ-1.4: con sesión restaurada pide el perfil con el id de userLite y lo guarda en el store', async () => {
      store.setAuth('jwt-1', user);
      const setLoading = spyOn(store, 'setLoadingProfile').and.callThrough();

      const result = service.hydrate();
      const req = http.expectOne(profileUrl);
      expect(req.request.method).toBe('GET');
      req.flush(profileResponse);
      await result;

      expect(store.userProfile()).toEqual({
        id: 7,
        email: 'ana@example.com',
        name: 'Ana',
        lastName: 'Gómez',
        avatar: null,
      });
      expect(setLoading.calls.allArgs()).toEqual([[true], [false]]);
    });

    it('REQ-1.4: sin sesión no pide nada', async () => {
      await service.hydrate();

      http.expectNone(profileUrl);
      expect(store.userProfile()).toBeNull();
    });

    it('REQ-1.4: si falla la carga del perfil, hydrate no rechaza, la sesión sigue y loadingProfile vuelve a false', async () => {
      store.setAuth('jwt-1', user);
      const setLoading = spyOn(store, 'setLoadingProfile').and.callThrough();

      const result = service.hydrate();
      http.expectOne(profileUrl).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      await expectAsync(result).toBeResolved();
      expect(store.token()).toBe('jwt-1');
      expect(store.userLite()).toEqual(user);
      expect(store.userProfile()).toBeNull();
      expect(setLoading.calls.allArgs()).toEqual([[true], [false]]);
    });
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
