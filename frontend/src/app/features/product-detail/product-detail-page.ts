import { CommonModule, DecimalPipe, Location } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../catalog-admin/products/services/product.service';
import { ProductResModel } from '../catalog-admin/products/models/prd-res.model';
import { resolveImageUrl } from '../../core/config/api.config';
import { CartStore } from '../../core/state/cart.store';
import { FavoritesStore } from '../../core/state/favorites.store';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationService } from '../../core/services/notification.service';
import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-product-detail-page',
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './product-detail-page.html',
})
export class ProductDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly location = inject(Location);
  private readonly cartStore = inject(CartStore);
  private readonly favoritesStore = inject(FavoritesStore);
  readonly authStore = inject(AuthStore);
  private readonly notificationService = inject(NotificationService);
  private readonly titleService = inject(Title);

  readonly product = signal<ProductResModel | null>(null);
  readonly quantity = signal(1);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal<string | null>(null);
  readonly addingToCart = signal(false);
  readonly togglingFavorite = signal(false);

  readonly isFavorite = computed(() => {
    const currentProduct = this.product();
    return currentProduct ? this.favoritesStore.isFavorite(currentProduct.id) : false;
  });

  readonly canAddToCart = computed(() => {
    const currentProduct = this.product();
    return !!currentProduct && currentProduct.stock > 0 && this.quantity() >= 1 && this.quantity() <= currentProduct.stock;
  });

  ngOnInit(): void {
    this.favoritesStore.loadFavorites().catch((error: unknown) => console.error(error));

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.notFound.set(true);
        this.loading.set(false);
        this.error.set(null);
        this.titleService.setTitle('Producto no encontrado');
        return;
      }

      this.loadProduct(slug);
    });
  }

  incrementQuantity() {
    const currentProduct = this.product();
    if (!currentProduct) {
      return;
    }

    const currentQty = this.quantity();
    if (currentQty < currentProduct.stock) {
      this.quantity.set(currentQty + 1);
    }
  }

  decrementQuantity() {
    const currentQty = this.quantity();
    if (currentQty > 1) {
      this.quantity.set(currentQty - 1);
    }
  }

  async addToCart() {
    const currentProduct = this.product();
    if (!currentProduct || !this.canAddToCart()) {
      return;
    }

    this.addingToCart.set(true);
    try {
      await this.cartStore.add({
        productId: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        qty: this.quantity(),
        stock: currentProduct.stock,
        thumbnailUrl: currentProduct.thumbnailUrl,
      });

      this.notificationService.success('Producto agregado al carrito.');
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo agregar el producto al carrito.');
    } finally {
      this.addingToCart.set(false);
    }
  }

  async toggleFavorite() {
    const currentProduct = this.product();
    if (!currentProduct) {
      return;
    }

    if (!this.authStore.isLoggedIn()) {
      this.notificationService.error('Inicia sesión para usar favoritos.');
      return;
    }

    this.togglingFavorite.set(true);
    try {
      await this.favoritesStore.toggleFavorite(currentProduct.id);
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo actualizar favoritos.');
    } finally {
      this.togglingFavorite.set(false);
    }
  }

  goBack() {
    this.location.back();
  }

  resolvedImageUrl(imageUrl: string | null | undefined): string {
    return resolveImageUrl(imageUrl) ?? 'https://placehold.co/700x700?text=Sin+imagen';
  }

  private async loadProduct(slug: string) {
    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);

    try {
      const product = await firstValueFrom(this.productService.getProductBySlug(slug));
      this.product.set(product);
      this.quantity.set(1);
      this.titleService.setTitle(`${product.name} | Catálogo`);
    } catch (error: any) {
      this.product.set(null);

      if (error?.status === 404) {
        this.notFound.set(true);
        this.titleService.setTitle('Producto no encontrado | Catálogo');
      } else {
        this.error.set('No se pudo cargar el producto. Intenta nuevamente.');
        this.titleService.setTitle('Error de producto | Catálogo');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
