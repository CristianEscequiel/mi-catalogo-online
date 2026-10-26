import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ProductModel } from '../../../../../core/data-access/products/product.model';
import { ProductService } from '../../../../../core/data-access/products/product.service';
import { PrdFormComponent } from '../product-form/product-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../../../../shared/utils/image-replacement.helper';
import { imageUploadErrorMessage } from '../../../../../shared/utils/image-rules';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, PrdFormComponent, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="bg-base-200 border border-base-300/40 rounded-3xl shadow-xl max-w-5xl w-[96vw] mx-auto overflow-hidden">
    <div class="flex items-start gap-3 p-4 sm:p-5 border-b border-base-300/50 bg-base-100/45">
      <div class="flex-1">
        @if (mode() === 'edit') {
          <h3 class="text-xl font-semibold">Editar producto</h3>
          <p class="text-sm text-base-content/70 mt-1">Completa la información del producto y utiliza IA para acelerar la carga.</p>
        } @else {
          <h3 class="text-xl font-semibold">Nuevo producto</h3>
          <p class="text-sm text-base-content/70 mt-1">Completa la información del producto y utiliza IA para acelerar la carga.</p>
        }
      </div>
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost mt-0.5" aria-label="Cerrar modal de producto" [disabled]="isSaving() || isUploadingImage()">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>
    </div>

    <div class="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
      <app-product-form
        [productForm]="form"
        [mode]="mode()"
        [imageUrl]="imageUrl()"
        [imageError]="imageError()"
        [isUploadingImage]="isUploadingImage()"
        [isDeletingImage]="isDeletingImage()"
        [isSaving]="isSaving()"
        (imageFileSelected)="onImageFileSelected($event)"
        (uploadImage)="onUploadImage()"
        (deleteImage)="onDeleteImage()"
        (submitForm)="onSubmit()"
        (cancelled)="onCancel()">
      </app-product-form>
    </div>
  </div>
  `
})
export class ProductFormDialogComponent {
  faTimes = faTimes;
  private dialog = inject(Dialog);
  form: FormGroup;
  readonly imageUrl = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly selectedImageFile = signal<File | null>(null);
  readonly isUploadingImage = signal(false);
  readonly isDeletingImage = signal(false);
  readonly isSaving = signal(false);
  readonly created = signal(false);

  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);
  private dialogRef = inject<DialogRef<'updated' | 'cancel'>>(DialogRef);
  data = inject<{ id: number; product: ProductModel; mode: FormMode }>(DIALOG_DATA);
  readonly mode = signal<FormMode>(this.data.mode);
  readonly entityId = signal<number | null>(this.data.id ?? null);

  constructor() {
    // Sin esto, Escape o el clic en el fondo cierran el diálogo con `undefined` mientras se guarda o se sube.
    effect(() => {
      this.dialogRef.disableClose = this.isSaving() || this.isUploadingImage() || this.created();
    });

    const data = this.data;
    this.imageUrl.set(data.product?.thumbnailUrl ?? null);

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
        status: this.fb.control<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
      });
    }
  }

  async onSubmit() {
    if (this.isUploadingImage()) {
      return;
    }
    this.imageError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    if (this.mode() === 'edit') {
      try {
        if (this.selectedImageFile() && !this.imageUrl()) {
          await this.uploadImageForEntity(this.entityId() as number);
        }

        const body = this.form.getRawValue() as ProductModel;
        body.thumbnailUrl = this.imageUrl() || null;
        body.categoryIds = Array.from(new Set((body.categoryIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));

        this.productService.editProduct(this.entityId() as number, body).subscribe({
          next: () => {
            this.notificationService.success('Producto actualizado correctamente.');
            this.dialogRef.close('updated');
          },
          error: () => {
            this.notificationService.error('No se pudo actualizar el producto.');
            this.isSaving.set(false);
          },
        });
        return;
      } catch {
        this.isSaving.set(false);
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
      if (this.selectedImageFile()) {
        try {
          await this.uploadImageForEntity(createdProduct.id as number, { notify: false });
        } catch {
          this.entityId.set(createdProduct.id as number);
          this.mode.set('edit');
          this.created.set(true);
          this.notificationService.error('Producto creado, pero no se pudo subir la imagen. Puedes reintentarlo.');
          this.isSaving.set(false);
          return;
        }
      }
      this.notificationService.success('Producto creado correctamente.');
      this.dialogRef.close('updated');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.notificationService.error('Límite de demo alcanzado');
        this.isSaving.set(false);
        return;
      }
      this.notificationService.error('No se pudo crear el producto.');
      this.isSaving.set(false);
    }
  }

  onCancel() {
    if (this.isSaving() || this.isUploadingImage()) {
      return;
    }
    this.dialogRef.close(this.created() ? 'updated' : 'cancel');
  }

  onImageFileSelected(file: File | null) {
    this.imageError.set(null);
    this.selectedImageFile.set(file);
  }

  async onUploadImage() {
    if (this.mode() === 'create') {
      this.imageError.set('Primero guarda el producto para subir su imagen.');
      return;
    }

    try {
      await this.uploadImageForEntity(this.entityId() as number);
    } catch {
      // El aviso ya lo dio uploadImageForEntity.
    }
  }

  async onDeleteImage() {
    if (this.mode() === 'create') {
      this.imageUrl.set(null);
      this.selectedImageFile.set(null);
      return;
    }

    try {
      await this.deleteImageFromEntity(true);
    } catch {
      // El aviso ya lo dio deleteImageFromEntity.
    }
  }

  private async uploadImageForEntity(productId: number, options?: { notify: boolean }) {
    const fileToUpload = this.selectedImageFile();
    if (!fileToUpload) {
      return;
    }

    try {
      this.isUploadingImage.set(true);

      if (this.imageUrl()) {
        const confirmed = await confirmImageReplacementDialog(this.dialog);
        if (!confirmed) {
          return;
        }
        await this.deleteImageFromEntity(false, false);
      }

      const response = await firstValueFrom(this.productService.uploadProductImage(productId, fileToUpload));
      this.imageUrl.set(response.imageUrl);
      this.selectedImageFile.set(null);
      this.imageError.set(null);
      this.notificationService.success('Imagen subida correctamente.');
    } catch (error) {
      const message = imageUploadErrorMessage(error);
      this.imageError.set(message);
      if (options?.notify !== false) {
        this.notificationService.error(message);
      }
      throw new Error('IMAGE_UPLOAD_FAILED');
    } finally {
      this.isUploadingImage.set(false);
    }
  }

  private async deleteImageFromEntity(showSuccessToast: boolean, clearSelection = true) {
    this.isDeletingImage.set(true);
    try {
      const response = await firstValueFrom(this.productService.deleteProductImage(this.entityId() as number));
      this.imageUrl.set(response.imageUrl);
      if (clearSelection) {
        this.selectedImageFile.set(null);
      }
      this.imageError.set(null);
      if (showSuccessToast) {
        this.notificationService.success('Imagen eliminada correctamente.');
      }
    } catch (error) {
      if (!showSuccessToast && isNotFoundHttpError(error)) {
        this.imageUrl.set(null);
        return;
      }
      this.notificationService.error('No se pudo eliminar la imagen.');
      throw new Error('IMAGE_DELETE_FAILED');
    } finally {
      this.isDeletingImage.set(false);
    }
  }
}
