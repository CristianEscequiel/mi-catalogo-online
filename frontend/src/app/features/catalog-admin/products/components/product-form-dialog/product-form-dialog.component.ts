import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { PrdFormComponent } from '../product-form/product-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, PrdFormComponent],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
  <div class="flex p-1">
    @if(data.mode === 'edit'){
      <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar producto</h3>
    } @else {
      <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Crear nuevo producto</h3>
    }

  <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">✕</button>
  </div>
  <app-product-form
    [productForm]="form"
    [mode]= data.mode
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
    private notificationService: NotificationService,
    private dialogRef: DialogRef<'updated' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id: number, product: ProductModel , mode: FormMode }
  ) {
    if(data.mode === 'edit') {
              this.form = this.fb.group({
                          name: this.fb.control(data.product.name),
                          description: this.fb.control(data.product.description ?? ''),
                          slug: this.fb.control(data.product.slug ?? ''),
                          sku: this.fb.control(data.product.sku ?? ''),
                          price: this.fb.control(data.product.price),
                          stock: this.fb.control(data.product.stock),
                          categoryIds: this.fb.control(data.product.categoryIds ?? []),
                          thumbnailUrl: this.fb.control(data.product.thumbnailUrl ?? null),
                          status: this.fb.control(data.product.status),
    });
  }else {
              this.form = this.fb.group({
                          name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
                          description: this.fb.control<string>('', { nonNullable: true }),
                          slug: this.fb.control<string>(''),
                          sku: this.fb.control<string>(''),
                          price: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
                          stock: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
                          categoryIds: this.fb.control<number[]>([], { nonNullable: true, validators: [] }),
                          thumbnailUrl: this.fb.control<string | null>(null),
                          status: this.fb.control<'DRAFT' | 'PUBLIC' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
          });
    }
  }

  async onSubmit() {
    if(this.data.mode === 'edit') {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue() as ProductModel;
    body.thumbnailUrl = body.thumbnailUrl || null;

    this.productService.editProduct(this.data.id, body).subscribe({
      next: () => {
        this.notificationService.success('Producto actualizado correctamente.');
        this.dialogRef.close('updated');
      },
      error: () => {
        this.notificationService.error('No se pudo actualizar el producto.');
      },
    });

  }else {
          if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
    const formValue = this.form.getRawValue();
    const body: ProductModel = {
      ...formValue,
      thumbnailUrl: formValue.thumbnailUrl || null,
    };
    try {
      await this.productService.postProduct(body);
      this.notificationService.success('Producto creado correctamente.');
      this.dialogRef.close('updated');
    } catch {
      this.notificationService.error('No se pudo crear el producto.');
    }
    }
  }
  onCancel() {
    this.dialogRef.close('cancel');
  }
}
