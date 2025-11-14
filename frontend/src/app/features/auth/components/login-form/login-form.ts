import { Component, inject } from '@angular/core';
import { AuthFacade } from '../../services/auth.facade';
import { Validators } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { UserFormLogin } from '../../../../core/models/user-form.model';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ ReactiveFormsModule ],
  templateUrl: './login-form.html',
})
export class LoginForm {
  authFacade = inject(AuthFacade)
  loginForm = new FormGroup<UserFormLogin>({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  })
  loginPost() {
    const { email, password } = this.loginForm.getRawValue();
    this.authFacade.loginUser(email, password)
    this.loginForm.reset();
  }
  postItems(){
    this.authFacade.newPost()
  }
}
