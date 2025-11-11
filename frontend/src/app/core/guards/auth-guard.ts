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
  return true;
};
