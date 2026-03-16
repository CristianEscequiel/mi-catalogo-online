import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../catalog-admin/products/services/product.service';
import { CategoryService } from '../catalog-admin/categories/services/category.service'
import { CategoryResModel } from '../catalog-admin/categories/models/category.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSliders , faPlus , faMinus , faCartPlus, faHeart } from '@fortawesome/free-solid-svg-icons';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductResModel } from '../catalog-admin/products/models/prd-res.model';
import { CartStore } from '../../core/state/cart.store';
import { FavoritesStore } from '../../core/state/favorites.store';
import { AuthStore } from '../../core/state/auth.store';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [FontAwesomeModule, ReactiveFormsModule , DecimalPipe],
  templateUrl: './home-page.html'
})
export class HomePage implements OnInit {
  private readonly cartStore = inject(CartStore);
  private readonly favoritesStore = inject(FavoritesStore);
  readonly authStore = inject(AuthStore);
  faFilter = faSliders;
  faPlus = faPlus;
  faMinus = faMinus;
  faCartPlus = faCartPlus;
  faHeart = faHeart;
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  allProducts: ProductResModel[] = [];
  products: ProductResModel[] = [];
  searchControl = new FormControl('', { nonNullable: true });
  categories: CategoryResModel[] = [];
  categoriesArray: { id: number, name: string }[] = [];
  quantities: Record<number, number> = {};

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe({
      next: res => {
        this.allProducts = res
        this.products = [...this.allProducts]
      },
      error: err => console.error(err),
    });
    this.categoryService.getCategories().subscribe({
      next: res => {
        this.categories = res,
        this.categoriesArray = this.categories.flatMap(item => {
          return { name: item.name, id: item.id }
        });
      },
      error: err => console.error(err),
    });

    this.searchControl.valueChanges.subscribe(value => {
      this.applyFilter(value)
    });

    this.favoritesStore.loadFavorites().catch((error: unknown) => console.error(error));
  }

  applyFilter(value: string) {
    const filteredProducts = this.allProducts.filter(product => {
      return product.name.toLowerCase().includes(value.toLowerCase())
    });
    this.products = filteredProducts
  }

setCategory(key: number) {
  this.products = this.allProducts.filter(product =>
    product.categories.some(cat => cat.id === key)
  );
}

 getQuantity(itemId: number): number {
    return this.quantities[itemId] ?? 1;
  }

  increaseQuantity(itemId: number, stock: number): void {
    const current = this.getQuantity(itemId);
    if (current < stock) {
      this.quantities[itemId] = current + 1;
    }
  }

  decreaseQuantity(itemId: number): void {
    const current = this.getQuantity(itemId);
    if (current > 1) {
      this.quantities[itemId] = current - 1;
    }
  }

  addToCart(item: { id: number; name: string; price: number }): void {
    const qty = this.getQuantity(item.id);

    this.cartStore.add({
      productId: item.id,
      name: item.name,
      price: item.price,
      qty
    });

    this.quantities[item.id] = 1;
  }

  isFavorite(productId: number): boolean {
    return this.favoritesStore.isFavorite(productId);
  }

  async toggleFavorite(productId: number): Promise<void> {
    if (!this.authStore.isLoggedIn()) {
      return;
    }

    try {
      await this.favoritesStore.toggleFavorite(productId);
    } catch (error) {
      console.error(error);
    }
  }

}
