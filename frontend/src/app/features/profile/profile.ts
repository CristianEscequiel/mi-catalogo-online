import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
import { Form, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFormLogin } from '../../core/models/user-form.model';
import { CommonModule } from '@angular/common';

interface ProfileForm {
name:FormControl;
lastName:FormControl;
// email:FormControl;
}

@Component({
  selector: 'app-profile',
  standalone:true,
  imports: [ReactiveFormsModule , CommonModule],
  templateUrl: './profile.html',
})
export class Profile implements AfterViewInit {
  profileForm = new FormGroup<ProfileForm>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  })

private store = inject(AuthStore)
profile = this.store.userProfile()
avatar = this.profile?.avatar;
enableEdit:boolean = false;

ngAfterViewInit(){
  this.profileForm.patchValue({
    name: this.profile?.name,
    lastName:this.profile?.lastName,
    // email:this.profile?.email
  })
  this.profileForm.disable()
}
edit(){
  this.profileForm.enable()
  this.enableEdit = true;
}
}
