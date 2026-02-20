import { Component, inject, OnInit } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ProductService } from '../catalog-admin/products/services/product.service';
import { CategoryService } from '../catalog-admin/categories/services/category.service'
import { CategoryResModel } from '../catalog-admin/categories/models/category.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductResModel } from '../catalog-admin/products/models/prd-res.model';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [FontAwesomeModule, ReactiveFormsModule, NgOptimizedImage],
  templateUrl: './home-page.html'
})
export class HomePage implements OnInit {
  faFilter = faSliders
  productService = inject(ProductService)
  categoryService = inject(CategoryService)
  allProducts: ProductResModel[] = [];
  products: ProductResModel[] = [];
  searchControl = new FormControl('', { nonNullable: true });
  categories: CategoryResModel[] = [];
  categoriesArray: { id: number, name: string }[] = []

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

  addToCart(item: any) {
    console.log(item)
  }

  getThumb(url: string) {
    try {
      const u = new URL(url);
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', '800');
      u.searchParams.set('dpr', '2');
      u.searchParams.set('fm', 'webp');
      return u.toString();
    } catch {
      return url;
    }
  }
}
