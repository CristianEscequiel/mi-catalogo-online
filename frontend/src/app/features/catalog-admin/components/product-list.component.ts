import { Component, inject, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service';
import { CdkTableModule } from '@angular/cdk/table';
import { CurrencyPipe, NgClass } from '@angular/common';
import { ProductModel } from '../models/product.model';
import { FormControl } from '@angular/forms';
import { ProductResModel } from '../models/prd-res.model';
interface categoryModel {
  id:number;
  name:string;
  descripcion:string;
  imageUrl:string
}

@Component({
  standalone: true,
  selector: 'app-prd-list',
  imports: [CdkTableModule ,CurrencyPipe, NgClass],
  templateUrl: 'product-list.html'
})

export class PrdListComponent implements OnInit {

productService = inject(ProductService)
displayedColumns: string[] = [
  'thumbnail',
  'name',
  'categories',
  'price',
  'sku',
  'status',
  'actions',
];
categories: categoryModel[] = []
sortField: keyof ProductModel | null = null;
sortDirection: 'asc' | 'desc' = 'asc';
searchControl = new FormControl('', { nonNullable: true });
products: ProductModel[] = [];
filteredProducts: ProductModel[] = [];

ngOnInit(): void {
  this.getAllProducts()
  this.productService.getCategories().subscribe({
    next: res => {this.categories = res} ,
    error: err => console.error(err),
  });
  this.searchControl.valueChanges.subscribe(() => {
    this.applyFilters();
  });
}

getAllProducts(){
    this.productService.getAllProducts().subscribe({
    next: res => {
      this.products = res;
      console.log(this.products)
      this.applyFilters();
    } ,
    error: err => console.error(err),
  });
}

onSort(field: keyof ProductModel) {
  if (this.sortField === field) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortField = field;
    this.sortDirection = 'asc';
  }
  this.applyFilters();
}
applyFilters() {
  const term = this.searchControl.value.toLowerCase().trim();
  let data = [...this.products];

  if (term) {
    data = data.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.slug?.toLowerCase().includes(term) ?? false)
    );
  }

  if (this.sortField) {
    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    data.sort((a, b) => {
      const va = a[field];
      const vb = b[field];

      if (va == null && vb != null) return -1 * dir;
      if (va != null && vb == null) return 1 * dir;
      if (va == null && vb == null) return 0;

      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }

      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  this.filteredProducts = data;
}
getCategoryNames(ids: number[]): string {
  if (!ids?.length || !this.categories?.length) return '-';

  const names = this.categories
    .filter(c => ids.includes(c.id))
    .map(c => c.name);

  return names.length ? names.join(', ') : '-';
}

onView(row: ProductModel) {
  // TODO: detalle / modal
}

onEdit(row: ProductResModel) {
  row.thumbnailUrl = ''

  const categories: number[] = []
  row.categories.map(cat => categories.push(cat.id))

  const body: ProductModel = {
    name: row.name,
    slug: row.slug,
    description: row.description,
    sku: row.sku,
    price:row.price,
    categoryIds: categories,
    thumbnailUrl: row.thumbnailUrl,
    status: row.status
  }
  this.productService.editProduct(row.id , body )
}

onDelete(row: ProductModel) {
  // TODO: modal de confirmación
}

}
