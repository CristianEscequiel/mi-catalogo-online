import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-request-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestPasswordResetComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  isLoading = false;

  readonly form = new FormGroup({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email } = this.form.getRawValue();

    try {
      await firstValueFrom(this.authService.requestPasswordReset(email));
      this.notificationService.success('Si el correo existe, te enviamos un enlace para restablecer tu contrasena.');
      this.router.navigate(['/auth/check-email'], { queryParams: { purpose: 'password-reset' } });
    } catch {
      this.notificationService.error('No pudimos procesar la solicitud. Intenta nuevamente.');
    } finally {
      this.isLoading = false;
    }
  }
}
