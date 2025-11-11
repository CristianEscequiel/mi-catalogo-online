import { Routes } from '@angular/router';
import { LoginForm } from './features/auth/components/login-form/login-form';
import { HomePage } from './features/home/home-page';
import { authGuard } from './core/guards/auth-guard';
import { Profile } from './features/profile/profile';
import { loginGuard } from './core/guards/login-guard';

export const routes: Routes = [
  {
    path: '',
    component: HomePage
  },
  {
    path: 'login',
    canActivate:[loginGuard],
    component: LoginForm,
  },
  {
    path: 'home',
    component: HomePage,
  },
  {
    path: 'profile',
    canActivate:[authGuard],
    component: Profile,
  },
];
