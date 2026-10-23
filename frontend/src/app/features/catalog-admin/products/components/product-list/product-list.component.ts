import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ProductService } from '../../../../../core/data-access/products/product.service';
import { CdkTableModule } from '@angular/cdk/table';
import { CurrencyPipe, NgClass } from '@angular/common';
import { ProductModel } from '../../../../../core/data-access/products/product.model';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductResModel } from '../../../../../core/data-access/products/prd-res.model';
import { Dialog } from '@angular/cdk/dialog';
import { ProductFormDialogComponent } from '../product-form-dialog/product-form-dialog.component';
import { ProductWarnDialogComponent } from '../product-warn-dialog/product-warn-dialog.component';
import { CategoryResModel } from '../../../../../core/data-access/categories/category.model'
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { resolveImageUrl } from '../../../../../core/config/api.config';
import { AdminToolbarComponent } from '../../../shared/components/admin-toolbar/admin-toolbar.component';
import { ProductMobileCardComponent } from '../../../shared/components/product-mobile-card/product-mobile-card.component';

@Component({
  standalone: true,
  selector: 'app-prd-list',
  imports: [CdkTableModule, CurrencyPipe, NgClass, ReactiveFormsModule, AdminToolbarComponent, ProductMobileCardComponent],
  templateUrl: 'product-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class PrdListComponent implements OnInit {
  private store = inject(AuthStore)
  productService = inject(ProductService)
  categoryService = inject(CategoryService)
  fb = inject(FormBuilder)
  dialog = inject(Dialog)
  displayedColumns: string[] = [
    'thumbnail',
    'name',
    'categories',
    'price',
    'stock',
    'sku',
    'status',
    'actions',
  ];
  readonly categories = signal<CategoryResModel[]>([]);
  readonly sortField = signal<keyof ProductResModel | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  searchControl = new FormControl('', { nonNullable: true });
  products: ProductResModel[] = [];
  readonly filteredProducts = signal<ProductResModel[]>([]);
  @ViewChild('myModal') myModal!: HTMLDialogElement;

  productForm = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string>('', { nonNullable: true }),
    slug: this.fb.control<string>(''),
    sku: this.fb.control<string>(''),
    price: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    categoryIds: this.fb.control<number[]>([], { nonNullable: true, validators: [] }),
    thumbnailUrl: this.fb.control<string | null>(null),
    status: this.fb.control<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.getProductsByUserId(this.store.userLite()?.id ?? 0);
    this.categoryService.getCategories().subscribe({
      next: res => { this.categories.set(res) },
      error: err => console.error(err),
    });
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  getProductsByUserId(id: number) {
    this.productService.getProductsByUserId(id).subscribe({
      next: res => {
        this.products = res;
        this.applyFilters();
      },
      error: err => console.error(err),
    });
  }
  reloadProducts(){
    this.getProductsByUserId(this.store.userLite()?.id ?? 0);
  }
  onSort(field: keyof ProductResModel) {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
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

    const field = this.sortField();
    if (field) {
      const dir = this.sortDirection() === 'asc' ? 1 : -1;

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

    this.filteredProducts.set(data);
  }
  getCategoryNames(row: ProductResModel): string {
    const ids = row.categories?.map(cat => cat.id);
    const categories = this.categories();
    if (!ids?.length || !categories.length) return '-';

    const names = categories
      .filter(cat => ids.includes(cat.id))
      .map(cat => cat.name);

    return names.length ? names.join(', ') : '-';
  }
  onCreate() {
    const ref = this.dialog.open(ProductFormDialogComponent, {
     data: { mode: 'create'}
    });
    ref.closed.subscribe(result => {
      if (result === 'updated') {
        this.reloadProducts();
      }
    });

  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: la vista de detalle del admin aún no está implementada; el parámetro lo pasa la plantilla
  onView(row: ProductResModel) {
    //Todo:
  }
  onEdit(row: ProductResModel) {
    const categories: number[] = []
    if(row.categories){
      row.categories.map(cat => categories.push(cat.id))
    }
    const body: ProductModel = {
      name: row.name,
      slug: row.slug,
      description: row.description,
      sku: row.sku,
      price:row.price,
      stock:row.stock,
      categoryIds: categories,
      thumbnailUrl: row.thumbnailUrl ?? '',
      status: row.status
    }
    const ref = this.dialog.open(ProductFormDialogComponent, {
      data: { id:row.id , product: body , mode:'edit' },
    });
    ref.closed.subscribe(result => {
      if (result === 'updated') {
        this.reloadProducts();
      }
    });
  }
  onDelete(row: ProductResModel) {

    const body: ProductModel = {
      name: row.name,
      slug: row.slug,
      description: row.description,
      sku: row.sku,
      price:row.price,
      stock:row.stock,
      categoryIds: [],
      thumbnailUrl: row.thumbnailUrl ?? '',
      status: row.status
    }
     const ref = this.dialog.open(ProductWarnDialogComponent, {
      data: { id:row.id , product: body  },
    });
    ref.closed.subscribe( result => {
      if (result === 'deleted') {
        this.reloadProducts();
      }
    })
  }

  resolveImageUrl(imagePath?: string | null) {
    return resolveImageUrl(imagePath);
  }

}
