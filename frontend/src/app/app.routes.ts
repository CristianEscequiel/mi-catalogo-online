import { Routes } from '@angular/router';
import { LoginForm } from './features/auth/components/login-form/login-form';
import { HomePage } from './features/home/home-page';
import { authGuard } from './core/guards/auth-guard';
import { Profile } from './features/profile/profile';
import { loginGuard } from './core/guards/login-guard';
import { PrdAdminComponet } from './features/catalog-admin/pages/product-admin.page';
import { CategoryAdminComponent } from './features/catalog-admin/pages/category-admin.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo:'home',
    pathMatch: 'full'
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
  {
  path: 'admin/product',
  canActivate: [authGuard],
  component: PrdAdminComponet,
  pathMatch: 'full'
},
{
  path: 'admin/category',
  canActivate: [authGuard],
  component: CategoryAdminComponent,
  pathMatch: 'full'
}

];
