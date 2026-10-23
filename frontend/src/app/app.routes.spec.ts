import { Route } from '@angular/router';

import { routes } from './app.routes';
import { authGuard } from './core/guards/auth-guard';

// Comprueba la configuración REAL de las rutas: si al pasar una pantalla a carga perezosa
// (loadComponent) se pierde un guard o un rol, estos tests fallan.
describe('app.routes (guards y roles)', () => {
  const route = (path: string): Route => {
    const found = routes.find((r) => r.path === path);
    expect(found).withContext(`no existe la ruta "${path}"`).toBeDefined();
    return found as Route;
  };

  const rolesOf = (path: string) => route(path).data?.['roles'] as string[] | undefined;

  describe('panel de administración', () => {
    it('REQ-5.6: admin/product está protegida por authGuard y admite ADMIN y GUEST', () => {
      expect(route('admin/product').canActivate).toEqual([authGuard]);
      expect(rolesOf('admin/product')).toEqual(['ADMIN', 'GUEST']);
    });

    it('REQ-5.6: admin/category está protegida por authGuard y admite ADMIN y GUEST', () => {
      expect(route('admin/category').canActivate).toEqual([authGuard]);
      expect(rolesOf('admin/category')).toEqual(['ADMIN', 'GUEST']);
    });

    it('REQ-5.6: admin/orders está protegida por authGuard y admite solo ADMIN', () => {
      expect(route('admin/orders').canActivate).toEqual([authGuard]);
      expect(rolesOf('admin/orders')).toEqual(['ADMIN']);
    });

    it('REQ-5.6: las tres rutas de administración conservan pathMatch "full"', () => {
      for (const path of ['admin/product', 'admin/category', 'admin/orders']) {
        expect(route(path).pathMatch).withContext(path).toBe('full');
      }
    });
  });

  describe('rutas que exigen sesión', () => {
    for (const path of ['checkout', 'checkout/success/:orderId', 'profile']) {
      it(`REQ-5.6: ${path} está protegida por authGuard`, () => {
        expect(route(path).canActivate).toEqual([authGuard]);
      });
    }
  });

  describe('rutas públicas', () => {
    for (const path of ['home', 'product/:slug', 'cart']) {
      it(`REQ-5.6: ${path} no exige authGuard`, () => {
        expect(route(path).canActivate ?? []).not.toContain(authGuard);
      });
    }
  });

  describe('Mis pedidos', () => {
    it('REQ-3.1: orders está protegida por authGuard y se carga con loadComponent', () => {
      expect(route('orders').canActivate).toEqual([authGuard]);
      expect(route('orders').loadComponent).toEqual(jasmine.any(Function));
      expect(route('orders').component).toBeUndefined();
    });

    it('REQ-4.1: orders/:id está protegida por authGuard y se carga con loadComponent', () => {
      expect(route('orders/:id').canActivate).toEqual([authGuard]);
      expect(route('orders/:id').loadComponent).toEqual(jasmine.any(Function));
      expect(route('orders/:id').component).toBeUndefined();
    });

    it('REQ-3.1: orders no restringe por rol (cualquier sesión)', () => {
      expect(rolesOf('orders')).toBeUndefined();
    });
  });
});
