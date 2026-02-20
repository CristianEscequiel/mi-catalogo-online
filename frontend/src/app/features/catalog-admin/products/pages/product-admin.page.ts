import { Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { PrdListComponent } from '../components/product-list/product-list.component';
import { PrdFormComponent } from '../components/product-form/product-form.component';
import { FormBuilder, Validators } from '@angular/forms';
import { ProductModel } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductCardPreviewComponent , ProductPreviewVm } from '../../../../shared/product-card-preview/product-card-preview.component';

type ProductFormValue = {
  name: string;
  description: string;
  slug: string | null;
  sku: string | null;
  price: number;
  categoryIds: number[];
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED';
};

@Component({
  standalone: true,
  selector: 'app-prd-admin',
  imports: [PrdListComponent, PrdFormComponent, ProductCardPreviewComponent],
  templateUrl: 'product-admin.html'
})
export class PrdAdminComponet implements OnInit {
productService = inject(ProductService)
fb = inject(FormBuilder)
destroyRef = inject(DestroyRef)
@ViewChild('listCmp') listCmp!: PrdListComponent;
activeTab: 'list' | 'create' = 'list';
setTab(tab: 'list' | 'create') {
  this.activeTab = tab;
  if (tab === 'list' && this.listCmp) {
    this.listCmp.reloadProducts();
  }
}

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

  previewVm: ProductPreviewVm = this.buildPreviewVm(this.productForm.getRawValue());

  ngOnInit(): void {
    this.productForm.valueChanges
      .pipe(
        startWith(this.productForm.getRawValue()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => {
        this.previewVm = this.buildPreviewVm(value as ProductFormValue);
      });
  }

onCreate(){
    const formValue = this.productForm.getRawValue();
    const body: ProductModel = {
      ...formValue,
      thumbnailUrl: formValue.thumbnailUrl || null,
    };
    console.log(body)
    this.productService.postProduct(body)
}

  private buildPreviewVm(value: ProductFormValue): ProductPreviewVm {
    const name = (value.name ?? '').trim();
    const description = (value.description ?? '').trim();
    const priceNumber = Number.isFinite(value.price) ? value.price : 0;
    const thumbnailUrl = (value.thumbnailUrl ?? '').trim() || null;

    const statusLabelMap: Record<ProductFormValue['status'], string> = {
      DRAFT: 'Borrador',
      PUBLIC: 'Público',
      ARCHIVED: 'Archivado',
    };

    const warnings: string[] = [];
    if (!name) warnings.push('El nombre está vacío.');
    if (!description) warnings.push('La descripción está vacía.');
    if (!thumbnailUrl) warnings.push('La imagen no está configurada.');
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) warnings.push('El precio debe ser mayor a 0.');

    return {
      name: name || 'Nombre del producto',
      description: description || 'Descripción corta del producto.',
      priceLabel: this.formatPrice(priceNumber),
      status: value.status ?? 'DRAFT',
      statusLabel: statusLabelMap[value.status ?? 'DRAFT'],
      thumbnailUrl,
      warnings,
    };
  }

  private formatPrice(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    return `$${safe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
