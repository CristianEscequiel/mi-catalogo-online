import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { AuthStore, UserRole } from '../state/auth.store';
import { authGuard } from './auth-guard';

// Roles de las rutas del panel de administración (app.routes.ts); app.routes.spec.ts comprueba que coinciden.
const PRODUCT_OR_CATEGORY_ROLES = ['ADMIN', 'GUEST'];
const ORDERS_ROLES = ['ADMIN'];

describe('authGuard', () => {
  let store: AuthStore;
  let router: { navigate: jasmine.Spy };

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const route = (roles?: string[]) => ({ data: roles ? { roles } : {} }) as unknown as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;
  const signIn = (role: UserRole | undefined) => store.setAuth('jwt', { id: 7, email: 'ana@example.com', role });

  beforeEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Router, useValue: router }],
    });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  describe('admin/product y admin/category (ADMIN y GUEST)', () => {
    it('REQ-5.6: deja pasar a ADMIN', () => {
      signIn('ADMIN');

      expect(executeGuard(route(PRODUCT_OR_CATEGORY_ROLES), state('/admin/product'))).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('REQ-5.6: deja pasar a GUEST (el invitado de la demo)', () => {
      signIn('GUEST');

      expect(executeGuard(route(PRODUCT_OR_CATEGORY_ROLES), state('/admin/category'))).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('REQ-5.6: rechaza a CLIENT y lo redirige a /home', () => {
      signIn('CLIENT');

      expect(executeGuard(route(PRODUCT_OR_CATEGORY_ROLES), state('/admin/product'))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/home']);
    });
  });

  describe('admin/orders (solo ADMIN)', () => {
    it('REQ-5.6: deja pasar a ADMIN', () => {
      signIn('ADMIN');

      expect(executeGuard(route(ORDERS_ROLES), state('/admin/orders'))).toBeTrue();
    });

    it('REQ-5.6: rechaza a GUEST y lo redirige a /home', () => {
      signIn('GUEST');

      expect(executeGuard(route(ORDERS_ROLES), state('/admin/orders'))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/home']);
    });

    it('REQ-5.6: rechaza a CLIENT y lo redirige a /home', () => {
      signIn('CLIENT');

      expect(executeGuard(route(ORDERS_ROLES), state('/admin/orders'))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/home']);
    });
  });

  describe('sin sesión y casos de borde', () => {
    it('REQ-5.6: sin sesión redirige a /login con returnUrl y authRequired', () => {
      expect(executeGuard(route(ORDERS_ROLES), state('/admin/orders'))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
        queryParams: { returnUrl: '/admin/orders', authRequired: '1' },
      });
    });

    it('REQ-5.6: una ruta sin data.roles solo exige estar logueado', () => {
      signIn('CLIENT');

      expect(executeGuard(route(), state('/checkout'))).toBeTrue();
    });

    it('REQ-5.6: si userLite no trae rol, toma el rol del payload del JWT', () => {
      const payload = btoa(JSON.stringify({ role: 'ADMIN' }));
      store.setAuth(`header.${payload}.firma`, { id: 7, email: 'ana@example.com' });

      expect(executeGuard(route(ORDERS_ROLES), state('/admin/orders'))).toBeTrue();
    });
  });
});
