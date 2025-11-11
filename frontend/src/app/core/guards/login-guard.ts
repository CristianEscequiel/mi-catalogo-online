import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth.store';
import { inject } from '@angular/core';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(AuthStore);
  if (store.token()) {
    router.navigate(['/home']);
    return false;
  }
  return true;
};
