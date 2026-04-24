import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { resolveImageUrl } from '../../core/config/api.config';
import { NotificationService } from '../../core/services/notification.service';
import { AuthStore } from '../../core/state/auth.store';
import { CartStore } from '../../core/state/cart.store';
import { FavoritesStore } from '../../core/state/favorites.store';
import { CategoryResModel } from '../catalog-admin/categories/models/category.model';
import { CategoryService } from '../catalog-admin/categories/services/category.service';
import { ProductResModel } from '../catalog-admin/products/models/prd-res.model';
import { ProductService } from '../catalog-admin/products/services/product.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [FontAwesomeModule, ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './home-page.html',
})
export class HomePage implements OnInit {
  readonly faFilter = faSliders;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly allProducts = signal<ProductResModel[]>([]);
  readonly categories = signal<CategoryResModel[]>([]);
  readonly quantities = signal<Record<number, number>>({});
  readonly pendingCartIds = signal<number[]>([]);
  readonly pendingFavoriteIds = signal<number[]>([]);
  readonly skeletonCards = Array.from({ length: 6 }, (_, index) => index);

  readonly filteredProducts = computed(() => {
    const searchTerm = this.searchTerm();
    const selectedCategoryId = this.selectedCategoryId();

    return this.allProducts().filter((product) => {
      const matchesText =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm);
      const matchesCategory =
        selectedCategoryId === null ||
        product.categories.some((category) => category.id === selectedCategoryId);

      return matchesText && matchesCategory;
    });
  });

  readonly hasActiveCategoryFilter = computed(() => this.selectedCategoryId() !== null);
  readonly selectedCategoryName = computed(() => {
    const selectedCategoryId = this.selectedCategoryId();
    if (selectedCategoryId === null) {
      return null;
    }

    return this.categories().find((category) => category.id === selectedCategoryId)?.name ?? null;
  });
  readonly hasProducts = computed(() => this.filteredProducts().length > 0);

  private readonly destroyRef = inject(DestroyRef);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartStore = inject(CartStore);
  private readonly favoritesStore = inject(FavoritesStore);
  private readonly authStore = inject(AuthStore);
  private readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value.toLowerCase().trim()));

    void this.loadInitialData();
  }

  async retryLoad(): Promise<void> {
    await this.loadInitialData();
  }

  setCategory(category: CategoryResModel | number | null, dropdown?: HTMLDetailsElement): void {
    if (typeof category === 'number') {
      this.selectedCategoryId.set(category);
    } else {
      this.selectedCategoryId.set(category?.id ?? null);
    }

    if (dropdown) {
      dropdown.open = false;
    }
  }

  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: true });
    this.selectedCategoryId.set(null);
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryId() === categoryId;
  }

  resolvedImageUrl(imageUrl: string | null | undefined): string {
    return resolveImageUrl(imageUrl) ?? 'https://placehold.co/600x480?text=Producto';
  }

  detailLink(item: ProductResModel): string[] {
    return item.slug ? ['/product', item.slug] : ['/home'];
  }

  isFavorite(productId: number): boolean {
    return this.favoritesStore.isFavorite(productId);
  }

  isFavoriteBusy(productId: number): boolean {
    return this.pendingFavoriteIds().includes(productId);
  }

  async toggleFavorite(productId: number): Promise<void> {
    if (!this.authStore.isLoggedIn()) {
      this.notificationService.info('Inicia sesion para guardar favoritos.');
      return;
    }

    if (this.isFavoriteBusy(productId)) {
      return;
    }

    const wasFavorite = this.isFavorite(productId);
    this.pendingFavoriteIds.update((ids) => [...ids, productId]);

    try {
      await this.favoritesStore.toggleFavorite(productId);
      this.notificationService.success(
        wasFavorite ? 'Producto quitado de favoritos.' : 'Producto agregado a favoritos.',
      );
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo actualizar favoritos.');
    } finally {
      this.pendingFavoriteIds.update((ids) => ids.filter((id) => id !== productId));
    }
  }

  getQuantity(itemId: number): number {
    return this.quantities()[itemId] ?? 1;
  }

  increaseQuantity(itemId: number, stock: number): void {
    const current = this.getQuantity(itemId);
    if (current < stock) {
      this.quantities.update((state) => ({ ...state, [itemId]: current + 1 }));
    }
  }

  decreaseQuantity(itemId: number): void {
    const current = this.getQuantity(itemId);
    if (current > 1) {
      this.quantities.update((state) => ({ ...state, [itemId]: current - 1 }));
    }
  }

  isAddingToCart(productId: number): boolean {
    return this.pendingCartIds().includes(productId);
  }

  async addToCart(item: ProductResModel): Promise<void> {
    if (item.stock < 1 || this.isAddingToCart(item.id)) {
      return;
    }

    const quantity = Math.min(this.getQuantity(item.id), item.stock);
    this.pendingCartIds.update((ids) => [...ids, item.id]);

    try {
      await this.cartStore.add({
        productId: item.id,
        name: item.name,
        price: item.price,
        qty: quantity,
        stock: item.stock,
        thumbnailUrl: item.thumbnailUrl,
      });

      this.notificationService.success('Producto agregado al carrito.');
      this.quantities.update((state) => ({ ...state, [item.id]: 1 }));
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo agregar el producto al carrito.');
    } finally {
      this.pendingCartIds.update((ids) => ids.filter((id) => id !== item.id));
    }
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [products, categories] = await Promise.all([
        firstValueFrom(this.productService.getAllProducts()),
        firstValueFrom(this.categoryService.getCategories()),
      ]);

      this.allProducts.set(products);
      this.categories.set(categories);

      if (this.authStore.isLoggedIn()) {
        this.favoritesStore.loadFavorites().catch((error: unknown) => console.error(error));
      }
    } catch (error) {
      console.error(error);
      this.error.set('No pudimos cargar el catalogo. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
