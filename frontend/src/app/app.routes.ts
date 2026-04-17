import { Routes } from '@angular/router';
import { LoginForm } from './features/auth/components/login-form/login-form';
import { HomePage } from './features/home/home-page';
import { authGuard } from './core/guards/auth-guard';
import { Profile } from './features/profile/profile';
import { loginGuard } from './core/guards/login-guard';
import { PrdAdminComponet } from './features/catalog-admin/products/pages/product-admin.page';
import { CategoryAdminComponent } from './features/catalog-admin/categories/pages/category-admin.page';
import { CartPage } from './features/cart/cart-page';
import { CheckoutPage } from './features/checkout/checkout-page';
import { CheckoutSuccessPage } from './features/checkout/checkout-success-page';
import { ProductDetailPage } from './features/product-detail/product-detail-page';
import { RegisterForm } from './features/auth/components/register-form/register-form';
import { OrderAdminPage } from './features/catalog-admin/orders/pages/order-admin.page';
import { VerifyEmailComponent } from './features/auth/pages/verify-email-screen';
import { CheckEmailComponent } from './features/auth/pages/check-email-page';
import { RequestPasswordResetComponent } from './features/auth/pages/forgot-password-page';
import { ResetPasswordComponent } from './features/auth/pages/reset-password-page';

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
    path: 'auth/login',
    canActivate:[loginGuard],
    component: LoginForm,
  },
  {
    path: 'register',
    canActivate: [loginGuard],
    component: RegisterForm,
  },
  {
    path: 'auth/check-email',
    component: CheckEmailComponent,
  },
  {
    path: 'auth/request-password-reset',
    component: RequestPasswordResetComponent,
  },
  {
    path: 'auth/forgot-password',
    component: RequestPasswordResetComponent,
  },
  {
    path: 'auth/reset-password',
    component: ResetPasswordComponent,
  },
  {
    path: 'auth/verify-email',
    component: VerifyEmailComponent,
  },
  {
    path: 'home',
    component: HomePage,
  },
  {
    path: 'product/:slug',
    component: ProductDetailPage,
  },
  {
    path: 'profile',
    canActivate:[authGuard],
    component: Profile,
  },
  {
    path: 'cart',
    component: CartPage,
  },
  {
    path: 'checkout',
    canActivate:[authGuard],
    component: CheckoutPage,
  },
  {
    path: 'checkout/success/:orderId',
    canActivate:[authGuard],
    component: CheckoutSuccessPage,
  },
  {
  path: 'admin/product',
  canActivate: [authGuard],
  component: PrdAdminComponet,
  data: { roles: ['ADMIN', 'GUEST'] },
  pathMatch: 'full'
},
{
  path: 'admin/category',
  canActivate: [authGuard],
  component: CategoryAdminComponent,
  data: { roles: ['ADMIN', 'GUEST'] },
  pathMatch: 'full'
},
{
  path: 'admin/orders',
  canActivate: [authGuard],
  component: OrderAdminPage,
  data: { roles: ['ADMIN'] },
  pathMatch: 'full'
}

];
