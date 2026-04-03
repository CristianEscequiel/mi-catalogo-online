import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../catalog-admin/products/services/product.service';
import { CategoryService } from '../catalog-admin/categories/services/category.service'
import { CategoryResModel } from '../catalog-admin/categories/models/category.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductResModel } from '../catalog-admin/products/models/prd-res.model';
import { resolveImageUrl } from '../../core/config/api.config';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [FontAwesomeModule, ReactiveFormsModule , DecimalPipe, RouterLink],
  templateUrl: './home-page.html'
})
export class HomePage implements OnInit {
  faFilter = faSliders;
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  allProducts: ProductResModel[] = [];
  products: ProductResModel[] = [];
  searchControl = new FormControl('', { nonNullable: true });
  categories: CategoryResModel[] = [];
  selectedCategoryId: number | null = null;
  selectedCategoryName: string | null = null;
  quantities: Record<number, number> = {};

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe({
      next: res => {
        this.allProducts = res
        this.applyFilters();
      },
      error: err => console.error(err),
    });
    this.categoryService.getCategories().subscribe({
      next: res => {
        this.categories = res;
      },
      error: err => console.error(err),
    });

    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  setCategory(category: CategoryResModel | number | null, dropdown?: HTMLDetailsElement) {
    if (typeof category === 'number') {
      const foundCategory = this.categories.find((item) => item.id === category) ?? null;
      this.selectedCategoryId = foundCategory?.id ?? null;
      this.selectedCategoryName = foundCategory?.name ?? null;
    } else {
      this.selectedCategoryId = category?.id ?? null;
      this.selectedCategoryName = category?.name ?? null;
    }
    this.applyFilters();
    if (dropdown) {
      dropdown.open = false;
    }
  }

  applyFilter(value: string) {
    this.searchControl.setValue(value ?? '', { emitEvent: false });
    this.applyFilters();
  }

  clearCategoryFilter() {
    this.selectedCategoryId = null;
    this.selectedCategoryName = null;
    this.applyFilters();
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryId === categoryId;
  }

  hasActiveCategoryFilter(): boolean {
    return this.selectedCategoryId !== null;
  }

  private applyFilters() {
    const searchTerm = this.searchControl.value.toLowerCase().trim();

    this.products = this.allProducts.filter((product) => {
      const matchesText = product.name.toLowerCase().includes(searchTerm);
      const matchesCategory =
        this.selectedCategoryId === null ||
        product.categories.some((cat) => cat.id === this.selectedCategoryId);

      return matchesText && matchesCategory;
    });
  }

   resolvedImageUrl(imageUrl: string | null): string | null {
      return resolveImageUrl(imageUrl);
    }

  detailLink(item: ProductResModel) {
    return item.slug ? ['/product', item.slug] : ['/home'];
  }

  isFavorite(_productId: number): boolean {
    return false;
  }

  async toggleFavorite(_productId: number): Promise<void> {
    return;
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

  async addToCart(_item: ProductResModel): Promise<void> {
    return;
  }

}
