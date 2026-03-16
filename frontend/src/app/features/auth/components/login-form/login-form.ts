import { Component, inject } from '@angular/core';
import { AuthFacade } from '../../services/auth.facade';
import { Validators } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { UserFormLogin } from '../../../../core/models/user-form.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login-form.html',
})
export class LoginForm {
  authFacade = inject(AuthFacade)
  loginForm = new FormGroup<UserFormLogin>({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  })
  async loginPost() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    try {
      await this.authFacade.loginUser(email, password);
      this.loginForm.reset();
    } catch {
      return;
    }
  }
  postItems(){
    this.authFacade.newPost()
  }
}
