import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade {

private store = inject(AuthStore);
private router = inject(Router);
private authService =  inject(AuthService)

async loginUser(email:string , password:string) {
  this.store.setLoadingProfile(true);
  const res = await firstValueFrom(this.authService.loginUser(email, password))
  this.store.setAuth(res.access_token, res.user)
  const profile = await firstValueFrom(this.authService.getUserById(res.user.id))

  this.store.setUserProfile(profile.profile as any);
  this.store.setLoadingProfile(false);

  this.router.navigate(['/home']);
}

  async hydrate() {
    const token = localStorage.getItem('token');
    const userLiteRaw = localStorage.getItem('userLite');
    if (!token || !userLiteRaw) return;

    const userLite = JSON.parse(userLiteRaw);
    this.store.setAuth(token, userLite);

    this.store.setLoadingProfile(true);
    const profile = await firstValueFrom(this.authService.getUserById(userLite.id));

    this.store.setUserProfile(profile.profile as any);
    this.store.setLoadingProfile(false);
  }

  logout() {
    this.store.clear();
    this.router.navigate(['/home']);
  }

}
