import { Component, inject } from '@angular/core';
import { AuthFacade } from '../../services/auth.facade';
import { Validators } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { UserFormLogin } from '../../../../core/models/user-form.model';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FontAwesomeModule, RouterLink],
  templateUrl: './login-form.html',
})
export class LoginForm {
  faEye = faEye
  faEyeSlash = faEyeSlash
  showPassword = false;
  isLoading = false;
  route = inject(ActivatedRoute);
  authFacade = inject(AuthFacade)
  returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
  authRequired = this.route.snapshot.queryParamMap.get('authRequired') === '1';
  loginForm = new FormGroup<UserFormLogin>({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  })

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async loginPost() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.getRawValue();
    try {
      await this.authFacade.loginUser(email, password, this.returnUrl);
      this.loginForm.reset();
    } catch {
      return;
    } finally {
      this.isLoading = false;
    }
  }
  postItems(){
    this.authFacade.newPost()
  }
}
