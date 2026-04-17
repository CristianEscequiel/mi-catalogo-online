import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthFacade } from '../services/auth.facade';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './check-email-page.html',
  styleUrl: './check-email-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authFacade = inject(AuthFacade);
  private readonly notificationService = inject(NotificationService);

  readonly purpose = signal(this.route.snapshot.queryParamMap.get('purpose') ?? 'email-verification');
  private readonly initialEmail = this.route.snapshot.queryParamMap.get('email')?.trim() ?? '';
  readonly isPasswordReset = computed(() => this.purpose() === 'password-reset');
  readonly isResending = signal(false);
  readonly resendSuccessMessage = signal('');

  readonly emailControl = new FormControl<string>(this.initialEmail, {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  readonly title = computed(() => 'Revisa tu correo');

  readonly description = computed(() =>
    this.isPasswordReset()
      ? 'Si la cuenta existe, te enviamos un enlace para restablecer tu contrasena. Revisa tu bandeja de entrada para continuar.'
      : 'Te enviamos un enlace de verificacion a tu email. Por favor, revisa tu bandeja de entrada para activar tu cuenta.',
  );

  readonly primaryActionText = computed(() => this.isPasswordReset() ? 'Ya cambie mi contrasena' : 'Ya verifique mi cuenta');
  readonly primaryActionLink = computed(() => '/auth/login');

  readonly secondaryActionText = computed(() => {
    if (this.isPasswordReset()) {
      return 'Volver a solicitar enlace';
    }

    return this.isResending() ? 'Enviando...' : 'Reenviar verificacion';
  });

  canResendVerification(): boolean {
    return !this.isPasswordReset() && this.emailControl.valid;
  }

  async onResendEmail(): Promise<void> {
    this.emailControl.markAsTouched();

    if (!this.canResendVerification()) {
      this.notificationService.error('Ingresa un email valido para reenviar la verificacion.');
      return;
    }

    const email = this.emailControl.getRawValue().trim();

    this.isResending.set(true);
    this.resendSuccessMessage.set('');
    try {
      await this.authFacade.resendVerificationEmail(email);
      const successMessage = 'Te enviamos un nuevo email de verificacion.';
      this.resendSuccessMessage.set(successMessage);
      this.notificationService.success(successMessage);
    } finally {
      this.isResending.set(false);
    }
  }
}
