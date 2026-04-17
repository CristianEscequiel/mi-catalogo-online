import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly token = signal(this.route.snapshot.queryParamMap.get('token')?.trim() ?? '');
  readonly tokenMissing = computed(() => !this.token());
  readonly successMessage = signal('');
  readonly hasSuccess = computed(() => this.successMessage().length > 0);

  isLoading = false;

  readonly form = new FormGroup({
    newPassword: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatchValidator] });

  async submit(): Promise<void> {
    if (this.tokenMissing()) {
      this.notificationService.error('El enlace para restablecer la contrasena no es valido.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword } = this.form.getRawValue();

    this.isLoading = true;
    try {
      console.log('Resetting password with token:', this.token() , 'and new password:', newPassword);
      const response = await firstValueFrom(this.authService.resetPassword(this.token(), newPassword));
      this.notificationService.success(response.message || 'Contrasena actualizada correctamente.');
      this.successMessage.set('Tu contrasena fue actualizada correctamente.');
      this.form.reset();
    } catch (error) {
      this.notificationService.error(this.resolveErrorMessage(error));
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No pudimos restablecer la contrasena. Intenta nuevamente mas tarde.';
    }

    const backendMessage = this.getBackendMessage(error.error?.message);
    if (backendMessage) {
      const lowered = backendMessage.toLowerCase();

      if (lowered.includes('expired')) {
        return 'El enlace para restablecer la contrasena expiro. Solicita uno nuevo.';
      }

      if (lowered.includes('invalid') && lowered.includes('token')) {
        return 'El enlace para restablecer la contrasena es invalido.';
      }

      if (backendMessage.length <= 120) {
        return backendMessage;
      }
    }

    return 'No pudimos restablecer la contrasena. Intenta nuevamente mas tarde.';
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

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}
