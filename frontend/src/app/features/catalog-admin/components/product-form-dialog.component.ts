import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { ProductModel } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { PrdFormComponent } from './product-form.component';

@Component({
  standalone: true,
  selector: 'app-product-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, PrdFormComponent],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
  <div class="flex p-1">
  <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar producto</h3>
  <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">✕</button>
  </div>
  <app-product-form
    [productForm]="form"
    mode="edit"
    (submitForm)="onSubmit()"
    (cancel)="onCancel()">
  </app-product-form>
</div>
  `
})
export class ProductFormDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private dialogRef: DialogRef<'updated' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id: number, product: ProductModel }
  ) {
    this.form = this.fb.group({
      name: this.fb.control(data.product.name),
      description: this.fb.control(data.product.description ?? ''),
      slug: this.fb.control(data.product.slug ?? ''),
      sku: this.fb.control(data.product.sku ?? ''),
      price: this.fb.control(data.product.price),
      categoryIds: this.fb.control(data.product.categoryIds ?? []),
      thumbnailUrl: this.fb.control(data.product.thumbnailUrl ?? null),
      status: this.fb.control(data.product.status),
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue() as ProductModel;

    this.productService.editProduct(this.data.id, body).subscribe({
      next: res => { this.dialogRef.close('updated') },
      error: err => console.error(err),
    });
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
