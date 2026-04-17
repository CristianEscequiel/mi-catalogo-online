import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isVerified = signal(false);
  readonly message = signal('Estamos verificando tu email...');

  constructor() {
    void this.verifyEmail();
  }

  private async verifyEmail() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isVerified.set(false);
      this.message.set('El enlace de verificación no es válido.');
      this.isLoading.set(false);
      this.notificationService.error('Falta el token de verificación.');
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.verifyEmail(token));
      this.isVerified.set(true);
      this.message.set('Tu email fue verificado correctamente. Ya puedes iniciar sesión.');
      this.notificationService.success(response.message || 'Email verificado correctamente.');
    } catch (error) {
      this.isVerified.set(false);
      this.message.set(this.resolveErrorMessage(error));
      this.notificationService.error(this.message());
    } finally {
      this.isLoading.set(false);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No pudimos verificar tu email. Intenta nuevamente más tarde.';
    }

    const backendMessage = error.error?.message;
    if (typeof backendMessage === 'string') {
      if (backendMessage.includes('expired')) {
        return 'El enlace de verificación expiró. Solicita uno nuevo.';
      }
      if (backendMessage.includes('Invalid verification token')) {
        return 'El enlace de verificación es inválido.';
      }
    }

    return 'No pudimos verificar tu email. Intenta nuevamente más tarde.';
  }
}
