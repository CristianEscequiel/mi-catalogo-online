import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStore, UserProfile } from '../../../core/state/auth.store';
import { ProfileResponse } from '../models/profile-res.model';
import { RegisterRequest } from '../models/register-req.model';
import { AuthService } from './auth.service';

// El store espera id y email; la respuesta del backend los trae al nivel del usuario, no dentro de `profile`.
function toUserProfile(res: ProfileResponse): UserProfile {
  return {
    id: res.id,
    email: res.email,
    name: res.profile.name,
    lastName: res.profile.lastName,
    avatar: res.profile.avatar,
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthFacade {
  private store = inject(AuthStore);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  async loginUser(email: string, password: string, redirectUrl = '/home') {
    try {
      this.store.setLoadingProfile(true);
      const res = await firstValueFrom(this.authService.loginUser(email, password));
      this.store.setAuth(res.access_token, res.user);
      const profile = await firstValueFrom(this.authService.getUserById(res.user.id));

      this.store.setUserProfile(toUserProfile(profile));
      this.notificationService.success('Inicio de sesion exitoso.');
      this.router.navigateByUrl(redirectUrl);
    } catch {
      this.notificationService.error('Credenciales invalidas. Intenta nuevamente.');
      throw new Error('LOGIN_FAILED');
    } finally {
      this.store.setLoadingProfile(false);
    }
  }

  async registerUser(payload: RegisterRequest, returnUrl?: string) {
    void returnUrl;
    try {
      await firstValueFrom(this.authService.registerUser(payload));
      this.notificationService.success('Cuenta creada correctamente. Te enviamos un email de verificacion.');
      this.router.navigate(['/auth/check-email'], {
        queryParams: {
          purpose: 'email-verification',
          email: payload.email,
        },
      });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.notificationService.error('Ese email ya esta registrado.');
        throw new Error('REGISTER_EMAIL_EXISTS');
      }

      this.notificationService.error('No pudimos completar el registro. Intenta nuevamente.');
      throw new Error('REGISTER_FAILED');
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      await firstValueFrom(this.authService.resendVerificationEmail(email));
    } catch {
      this.notificationService.error('No pudimos reenviar el email de verificacion. Intenta nuevamente.');
      throw new Error('RESEND_VERIFICATION_FAILED');
    }
  }

  // La sesión ya la restauró AuthStore.rehydrate() (APP_INITIALIZER de main.ts): aquí solo se carga el perfil.
  // Si la carga falla la sesión sigue abierta y el perfil queda sin cargar; no se rechaza la promesa.
  async hydrate() {
    const userLite = this.store.userLite();
    if (!this.store.token() || !userLite) return;

    this.store.setLoadingProfile(true);
    try {
      const profile = await firstValueFrom(this.authService.getUserById(userLite.id));
      this.store.setUserProfile(toUserProfile(profile));
    } catch (error) {
      console.error('No se pudo cargar el perfil', error);
    } finally {
      this.store.setLoadingProfile(false);
    }
  }

  logout() {
    this.store.clear();
    this.router.navigate(['/home']);
  }
}
