import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';
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
import { ProductPage, ProductService } from '../catalog-admin/products/services/product.service';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [FontAwesomeModule, ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './home-page.html',
})
export class HomePage implements OnInit {
  readonly faFilter = faSliders;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadMoreError = signal(false);
  readonly selectedCategoryId = signal<number | null>(null);
  // Productos ya cargados (acumulados página a página); la búsqueda y la categoría se resuelven en el servidor.
  readonly products = signal<ProductResModel[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly categories = signal<CategoryResModel[]>([]);
  readonly quantities = signal<Record<number, number>>({});
  readonly pendingCartIds = signal<number[]>([]);
  readonly pendingFavoriteIds = signal<number[]>([]);
  readonly skeletonCards = Array.from({ length: 6 }, (_, index) => index);

  readonly hasActiveCategoryFilter = computed(() => this.selectedCategoryId() !== null);
  readonly selectedCategoryName = computed(() => {
    const selectedCategoryId = this.selectedCategoryId();
    if (selectedCategoryId === null) {
      return null;
    }

    return this.categories().find((category) => category.id === selectedCategoryId)?.name ?? null;
  });
  readonly hasProducts = computed(() => this.products().length > 0);
  readonly hasMore = computed(() => this.page() < this.totalPages());

  private readonly destroyRef = inject(DestroyRef);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartStore = inject(CartStore);
  private readonly favoritesStore = inject(FavoritesStore);
  private readonly authStore = inject(AuthStore);
  private readonly notificationService = inject(NotificationService);

  // Cada pedido de página de reemplazo incrementa el número; una respuesta de un número anterior se descarta.
  private requestSeq = 0;
  // Texto de búsqueda con el que se pidió la lista que se está mostrando.
  private appliedSearch = '';

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value.trim() !== this.appliedSearch) {
          void this.reload();
        }
      });

    void this.loadInitialData();
  }

  async retryLoad(): Promise<void> {
    await this.loadInitialData();
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const seq = this.requestSeq;
    this.loadingMore.set(true);
    this.loadMoreError.set(false);

    try {
      const result = await firstValueFrom(this.fetchPage(this.page() + 1));
      if (seq !== this.requestSeq) {
        return;
      }

      // Si se publicó algo mientras se navegaba, el resto se desplaza y un producto puede repetirse.
      const shownIds = new Set(this.products().map((product) => product.id));
      this.products.update((current) => [...current, ...result.items.filter((item) => !shownIds.has(item.id))]);
      this.setPageInfo(result);
    } catch (error) {
      if (seq === this.requestSeq) {
        console.error(error);
        this.loadMoreError.set(true);
      }
    } finally {
      if (seq === this.requestSeq) {
        this.loadingMore.set(false);
      }
    }
  }

  setCategory(category: CategoryResModel | number | null, dropdown?: HTMLDetailsElement): void {
    const categoryId = typeof category === 'number' ? category : (category?.id ?? null);
    const changed = categoryId !== this.selectedCategoryId();
    this.selectedCategoryId.set(categoryId);

    if (dropdown) {
      dropdown.open = false;
    }

    if (changed) {
      void this.reload();
    }
  }

  clearFilters(): void {
    // Sin emitir: la recarga es inmediata y no debe esperar al debounce de la búsqueda.
    this.searchControl.setValue('', { emitEvent: false });
    this.selectedCategoryId.set(null);
    void this.reload();
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
    await this.load(true);
  }

  // Vuelve a la página 1 con la búsqueda y la categoría actuales y reemplaza los productos mostrados.
  private async reload(): Promise<void> {
    await this.load(false);
  }

  private async load(includeCategories: boolean): Promise<void> {
    const seq = ++this.requestSeq;
    this.appliedSearch = this.searchControl.value.trim();
    this.loading.set(true);
    this.loadingMore.set(false);
    this.loadMoreError.set(false);
    this.error.set(null);

    try {
      const [result, categories] = await Promise.all([
        firstValueFrom(this.fetchPage(1)),
        includeCategories ? firstValueFrom(this.categoryService.getCategories()) : Promise.resolve(null),
      ]);
      if (seq !== this.requestSeq) {
        return;
      }

      this.products.set(result.items);
      this.setPageInfo(result);
      if (categories) {
        this.categories.set(categories);
      }

      if (includeCategories && this.authStore.isLoggedIn()) {
        this.favoritesStore.loadFavorites().catch((error: unknown) => console.error(error));
      }
    } catch (error) {
      if (seq !== this.requestSeq) {
        return;
      }
      console.error(error);
      this.error.set('No pudimos cargar el catalogo. Intenta nuevamente.');
    } finally {
      if (seq === this.requestSeq) {
        this.loading.set(false);
      }
    }
  }

  private fetchPage(page: number) {
    return this.productService.getProductsPage({
      page,
      limit: PAGE_SIZE,
      search: this.appliedSearch,
      categoryId: this.selectedCategoryId(),
    });
  }

  private setPageInfo(result: ProductPage): void {
    this.page.set(result.page);
    this.totalPages.set(result.totalPages);
    this.total.set(result.total);
  }
}
