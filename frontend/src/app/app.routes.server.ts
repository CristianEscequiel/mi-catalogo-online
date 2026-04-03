import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'cart',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout/success/:orderId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'product/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/product',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/category',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  }
];
