import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { PrdFormComponent } from '../product-form/product-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, PrdFormComponent ,FontAwesomeModule],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
    <div class="flex p-1">
      @if(data.mode === 'edit'){
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar producto</h3>
      } @else {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Crear nuevo producto</h3>
      }
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>
    </div>
    <app-product-form
      [productForm]="form"
      [mode]="data.mode"
      [imageUrl]="imageUrl"
      [imageError]="imageError"
      [isUploadingImage]="isUploadingImage"
      [isDeletingImage]="isDeletingImage"
      (imageFileSelected)="onImageFileSelected($event)"
      (uploadImage)="onUploadImage()"
      (deleteImage)="onDeleteImage()"
      (submitForm)="onSubmit()"
      (cancel)="onCancel()">
    </app-product-form>
  </div>
  `
})
export class ProductFormDialogComponent {
  faTimes = faTimes;
  form: FormGroup;
  imageUrl: string | null = null;
  imageError: string | null = null;
  selectedImageFile: File | null = null;
  isUploadingImage = false;
  isDeletingImage = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private notificationService: NotificationService,
    private dialogRef: DialogRef<'updated' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id: number; product: ProductModel; mode: FormMode },
  ) {
    this.imageUrl = data.product?.thumbnailUrl ?? null;

    if (data.mode === 'edit') {
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
    } else {
      this.form = this.fb.group({
        name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
        description: this.fb.control<string>('', { nonNullable: true }),
        slug: this.fb.control<string>(''),
        sku: this.fb.control<string>(''),
        price: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        stock: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        categoryIds: this.fb.control<number[]>([], { nonNullable: true }),
        thumbnailUrl: this.fb.control<string | null>(null),
        status: this.fb.control<'DRAFT' | 'PUBLIC' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
      });
    }
  }

  async onSubmit() {
    this.imageError = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.data.mode === 'edit') {
      if (this.selectedImageFile && !this.imageUrl) {
        await this.uploadImageForEntity(this.data.id);
      }

      const body = this.form.getRawValue() as ProductModel;
      body.thumbnailUrl = this.imageUrl || null;
      body.categoryIds = Array.from(new Set((body.categoryIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));

      this.productService.editProduct(this.data.id, body).subscribe({
        next: () => {
          this.notificationService.success('Producto actualizado correctamente.');
          this.dialogRef.close('updated');
        },
        error: () => {
          this.notificationService.error('No se pudo actualizar el producto.');
        },
      });
      return;
    }

    const formValue = this.form.getRawValue();
    const body: ProductModel = {
      ...formValue,
      thumbnailUrl: null,
    };
    body.categoryIds = Array.from(new Set((body.categoryIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));

    try {
      const createdProduct = await this.productService.postProduct(body);
      if (this.selectedImageFile) {
        await this.uploadImageForEntity(createdProduct.id as number);
      }
      this.notificationService.success('Producto creado correctamente.');
      this.dialogRef.close('updated');
    } catch {
      this.notificationService.error('No se pudo crear el producto.');
    }
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }

  onImageFileSelected(file: File | null) {
    this.imageError = null;
    this.selectedImageFile = file;
  }

  async onUploadImage() {
    if (this.data.mode === 'create') {
      this.imageError = 'Primero guarda el producto para subir su imagen.';
      return;
    }

    await this.uploadImageForEntity(this.data.id);
  }

  onDeleteImage() {
    if (this.data.mode === 'create') {
      this.imageUrl = null;
      this.selectedImageFile = null;
      return;
    }

    this.deleteImageFromEntity(true);
  }

  private async uploadImageForEntity(productId: number) {
    if (!this.selectedImageFile) {
      return;
    }

    try {
      this.isUploadingImage = true;

      if (this.imageUrl) {
        await this.deleteImageFromEntity(false);
      }

      const response = await firstValueFrom(this.productService.uploadProductImage(productId, this.selectedImageFile));
      this.imageUrl = response.imageUrl;
      this.selectedImageFile = null;
      this.imageError = null;
      this.notificationService.success('Imagen subida correctamente.');
    } catch {
      this.imageError = 'No se pudo subir la imagen.';
      this.notificationService.error('No se pudo subir la imagen.');
      throw new Error('IMAGE_UPLOAD_FAILED');
    } finally {
      this.isUploadingImage = false;
    }
  }

  private async deleteImageFromEntity(showSuccessToast: boolean) {
    this.isDeletingImage = true;
    try {
      const response = await firstValueFrom(this.productService.deleteProductImage(this.data.id));
      this.imageUrl = response.imageUrl;
      this.selectedImageFile = null;
      this.imageError = null;
      if (showSuccessToast) {
        this.notificationService.success('Imagen eliminada correctamente.');
      }
    } catch {
      this.notificationService.error('No se pudo eliminar la imagen.');
      throw new Error('IMAGE_DELETE_FAILED');
    } finally {
      this.isDeletingImage = false;
    }
  }
}
