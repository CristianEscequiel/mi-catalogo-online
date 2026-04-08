import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { RegisterRequest } from '../models/register-req.model';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade {

private store = inject(AuthStore);
private router = inject(Router);
private authService =  inject(AuthService)
private notificationService = inject(NotificationService);

async loginUser(email:string , password:string, redirectUrl = '/home') {
  try {
    this.store.setLoadingProfile(true);
    const res = await firstValueFrom(this.authService.loginUser(email, password))
    this.store.setAuth(res.access_token, res.user)
    const profile = await firstValueFrom(this.authService.getUserById(res.user.id))

    this.store.setUserProfile(profile.profile as any);
    this.notificationService.success('Inicio de sesión exitoso.');
    this.router.navigateByUrl(redirectUrl);
  } catch {
    this.notificationService.error('Credenciales inválidas. Intenta nuevamente.');
    throw new Error('LOGIN_FAILED');
  } finally {
    this.store.setLoadingProfile(false);
  }
}

async registerUser(payload: RegisterRequest, returnUrl?: string) {
  try {
    await firstValueFrom(this.authService.registerUser(payload));
    this.notificationService.success('Cuenta creada correctamente. Inicia sesi��n para continuar.');
    this.router.navigate(['/login'], {
      queryParams: {
        ...(returnUrl ? { returnUrl } : {}),
      },
    });
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.notificationService.error('Ese email ya est�� registrado.');
      throw new Error('REGISTER_EMAIL_EXISTS');
    }

    this.notificationService.error('No pudimos completar el registro. Intenta nuevamente.');
    throw new Error('REGISTER_FAILED');
  }
}

async newPost (){
  const res = await firstValueFrom(this.authService.postItems())
  return res
}

  async hydrate() {
    const token = localStorage.getItem('token');
    const userLiteRaw = localStorage.getItem('userLite');
    if (!token || !userLiteRaw) return;

    const userLite = JSON.parse(userLiteRaw);
    this.store.setAuth(token, userLite);

    this.store.setLoadingProfile(true);
    const profile = await firstValueFrom(this.authService.getUserById(userLite.id));

    this.store.setUserProfile(profile.profile as any);
    this.store.setLoadingProfile(false);

  }

  logout() {
    this.store.clear();
    this.router.navigate(['/home']);
  }

}
