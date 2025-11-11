import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../state/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const token = store.token();
  if (!token) return next(req);

  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authReq);
};
