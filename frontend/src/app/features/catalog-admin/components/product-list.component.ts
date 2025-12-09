import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../services/product.service';
import { CdkTableModule } from '@angular/cdk/table';
import { CurrencyPipe, NgClass } from '@angular/common';
import { ProductModel } from '../models/product.model';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductResModel } from '../models/prd-res.model';
import { PrdFormComponent } from "./product-form.component";
import { Dialog } from '@angular/cdk/dialog';
import { ProductFormDialogComponent } from './product-form-dialog.component';
import { ProductWarnDialogComponent } from './warn-dialog.component';
interface categoryModel {
  id: number;
  name: string;
  descripcion: string;
  imageUrl: string
}

@Component({
  standalone: true,
  selector: 'app-prd-list',
  imports: [CdkTableModule, CurrencyPipe, NgClass , ReactiveFormsModule],
  templateUrl: 'product-list.html'
})

export class PrdListComponent implements OnInit {
  productService = inject(ProductService)
  fb = inject(FormBuilder)
  dialog = inject(Dialog)
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
  @ViewChild('myModal') myModal!: HTMLDialogElement;

  productForm = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string>('', { nonNullable: true }),
    slug: this.fb.control<string>(''),
    sku: this.fb.control<string>(''),
    price: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    categoryIds: this.fb.control<number[]>([], { nonNullable: true, validators: [] }),
    thumbnailUrl: this.fb.control<string | null>(null),
    status: this.fb.control<'DRAFT' | 'PUBLIC' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.getAllProducts()
    this.productService.getCategories().subscribe({
      next: res => { this.categories = res },
      error: err => console.error(err),
    });
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  getAllProducts() {
    this.productService.getAllProducts().subscribe({
      next: res => {
        this.products = res;
        this.applyFilters();
      },
      error: err => console.error(err),
    });
  }

  reloadProducts(){
    this.getAllProducts()
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
    const ref = this.dialog.open(ProductFormDialogComponent, {
      data: { id:row.id , product: body },
    });
    ref.closed.subscribe(result => {
      if (result === 'updated') {
        this.reloadProducts();
      }
    });
  }

  onDelete(row: ProductResModel) {
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
     const ref = this.dialog.open(ProductWarnDialogComponent, {
      data: { id:row.id , product: body },
    });
    ref.closed.subscribe( result => {
      if (result === 'deleted') {
        this.reloadProducts();
      }
    })
  }

}
