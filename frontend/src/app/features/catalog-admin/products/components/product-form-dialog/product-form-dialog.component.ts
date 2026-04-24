import { Component, inject, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { PrdFormComponent } from '../product-form/product-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../../../../shared/utils/image-replacement.helper';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, PrdFormComponent, FontAwesomeModule],
  template: `
  <div class="bg-base-200 border border-base-300/40 rounded-3xl shadow-xl max-w-5xl w-[96vw] mx-auto overflow-hidden">
    <div class="flex items-start gap-3 p-4 sm:p-5 border-b border-base-300/50 bg-base-100/45">
      <div class="flex-1">
        @if (data.mode === 'edit') {
          <h3 class="text-xl font-semibold">Editar producto</h3>
          <p class="text-sm text-base-content/70 mt-1">Completa la información del producto y utiliza IA para acelerar la carga.</p>
        } @else {
          <h3 class="text-xl font-semibold">Nuevo producto</h3>
          <p class="text-sm text-base-content/70 mt-1">Completa la información del producto y utiliza IA para acelerar la carga.</p>
        }
      </div>
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost mt-0.5" aria-label="Cerrar modal de producto" [disabled]="isSaving">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>
    </div>

    <div class="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
      <app-product-form
        [productForm]="form"
        [mode]="data.mode"
        [imageUrl]="imageUrl"
        [imageError]="imageError"
        [isUploadingImage]="isUploadingImage"
        [isDeletingImage]="isDeletingImage"
        [isSaving]="isSaving"
        (imageFileSelected)="onImageFileSelected($event)"
        (uploadImage)="onUploadImage()"
        (deleteImage)="onDeleteImage()"
        (submitForm)="onSubmit()"
        (cancel)="onCancel()">
      </app-product-form>
    </div>
  </div>
  `
})
export class ProductFormDialogComponent {
  faTimes = faTimes;
  private dialog = inject(Dialog);
  form: FormGroup;
  imageUrl: string | null = null;
  imageError: string | null = null;
  selectedImageFile: File | null = null;
  isUploadingImage = false;
  isDeletingImage = false;
  isSaving = false;

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

    this.isSaving = true;

    if (this.data.mode === 'edit') {
      try {
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
            this.isSaving = false;
          },
        });
        return;
      } catch {
        this.isSaving = false;
        return;
      }
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
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.notificationService.error('Límite de demo alcanzado');
        this.isSaving = false;
        return;
      }
      this.notificationService.error('No se pudo crear el producto.');
      this.isSaving = false;
    }
  }

  onCancel() {
    if (this.isSaving) {
      return;
    }
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

    const fileToUpload = this.selectedImageFile;

    try {
      this.isUploadingImage = true;

      if (this.imageUrl) {
        const confirmed = await confirmImageReplacementDialog(this.dialog);
        if (!confirmed) {
          return;
        }
        await this.deleteImageFromEntity(false, false);
      }

      const response = await firstValueFrom(this.productService.uploadProductImage(productId, fileToUpload));
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

  private async deleteImageFromEntity(showSuccessToast: boolean, clearSelection = true) {
    this.isDeletingImage = true;
    try {
      const response = await firstValueFrom(this.productService.deleteProductImage(this.data.id));
      this.imageUrl = response.imageUrl;
      if (clearSelection) {
        this.selectedImageFile = null;
      }
      this.imageError = null;
      if (showSuccessToast) {
        this.notificationService.success('Imagen eliminada correctamente.');
      }
    } catch (error) {
      if (!showSuccessToast && isNotFoundHttpError(error)) {
        this.imageUrl = null;
        return;
      }
      this.notificationService.error('No se pudo eliminar la imagen.');
      throw new Error('IMAGE_DELETE_FAILED');
    } finally {
      this.isDeletingImage = false;
    }
  }
}
