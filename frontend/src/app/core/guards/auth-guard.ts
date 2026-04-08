import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth.store';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(AuthStore);

  const isLoggedIn = !!store.token();

  if (!isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = store.userLite()?.role ?? getRoleFromToken(store.token());
  if (!userRole || !allowedRoles.includes(userRole)) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};

function getRoleFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}
