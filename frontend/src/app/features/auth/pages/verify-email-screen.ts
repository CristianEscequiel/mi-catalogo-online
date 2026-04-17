import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../services/auth.service';

interface VerifyEmailState {
  loading: boolean;
  success: boolean;
  error: boolean;
  message: string;
}

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email-screen.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly state = signal<VerifyEmailState>({
    loading: true,
    success: false,
    error: false,
    message: 'Estamos confirmando tu cuenta, por favor espera...',
  });

  readonly title = computed(() => {
    const currentState = this.state();
    if (currentState.loading) {
      return 'Verificando correo';
    }

    if (currentState.success) {
      return 'Correo verificado';
    }

    return 'No pudimos verificar tu correo';
  });

  constructor() {
    void this.verifyEmail();
  }

  private async verifyEmail() {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();

    if (!token) {
      this.setErrorState('El enlace de verificacion no es valido o esta incompleto.');
      this.notificationService.error('Falta el token de verificacion.');
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.verifyEmail(token));
      this.setSuccessState('Tu cuenta ya fue activada correctamente.');
      this.notificationService.success(response.message || 'Email verificado correctamente.');
    } catch (error) {
      const errorMessage = this.resolveErrorMessage(error);
      this.setErrorState(errorMessage);
      this.notificationService.error(errorMessage);
    }
  }

  private setSuccessState(message: string): void {
    this.state.set({
      loading: false,
      success: true,
      error: false,
      message,
    });
  }

  private setErrorState(message: string): void {
    this.state.set({
      loading: false,
      success: false,
      error: true,
      message,
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No pudimos verificar tu correo. Intenta nuevamente mas tarde.';
    }

    const backendMessage = this.getBackendMessage(error.error?.message);
    if (backendMessage) {
      const lowered = backendMessage.toLowerCase();

      if (lowered.includes('expired')) {
        return 'El enlace de verificacion expiro. Solicita uno nuevo.';
      }

      if (lowered.includes('invalid verification token')) {
        return 'El enlace de verificacion es invalido.';
      }

      if (lowered.includes('invalid') && lowered.includes('token')) {
        return 'El enlace de verificacion es invalido.';
      }

      if (backendMessage.length <= 120) {
        return backendMessage;
      }
    }

    return 'No pudimos verificar tu correo. Intenta nuevamente mas tarde.';
  }

  private getBackendMessage(rawMessage: unknown): string | null {
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }

    if (Array.isArray(rawMessage) && rawMessage.length > 0 && typeof rawMessage[0] === 'string') {
      return rawMessage[0];
    }

    return null;
  }
}
