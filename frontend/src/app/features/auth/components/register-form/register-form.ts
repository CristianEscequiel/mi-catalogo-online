import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserFormRegister } from '../../../../core/models/user-form.model';
import { AuthFacade } from '../../services/auth.facade';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register-form.html',
})
export class RegisterForm {
  isLoading = false;
  authFacade = inject(AuthFacade);

  registerForm = new FormGroup<UserFormRegister>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { name, lastName, email, password } = this.registerForm.getRawValue();
    try {
      await this.authFacade.registerUser({
        email,
        password,
        profile: {
          name,
          lastName,
        },
      });
      this.registerForm.reset();
    } catch {
      return;
    } finally {
      this.isLoading = false;
    }
  }
}
