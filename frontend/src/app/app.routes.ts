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
    canActivate:[authGuard],
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
  pathMatch: 'full'
},
{
  path: 'admin/category',
  canActivate: [authGuard],
  component: CategoryAdminComponent,
  pathMatch: 'full'
}

];
