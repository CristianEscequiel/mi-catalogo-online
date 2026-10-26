import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CategoryModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../../../../shared/utils/image-replacement.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { imageUploadErrorMessage } from '../../../../../shared/utils/image-rules';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-category-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, CategoryFormComponent, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
    <div class="flex p-1">
      @if (mode() === 'edit') {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar categoria</h3>
      } @else {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Crear nueva categoria</h3>
      }
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost" aria-label="Cerrar modal de categoría" [disabled]="isSaving() || isUploadingImage()">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>
    </div>
    <app-category-form
      [categoryForm]="form"
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
    </app-category-form>
  </div>
  `
})
export class CategoryFormDialogComponent {
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
  private categoryService = inject(CategoryService);
  private notificationService = inject(NotificationService);
  private dialogRef = inject<DialogRef<'updated' | 'cancel'>>(DialogRef);
  private readonly data = inject<{ id?: number; category?: CategoryModel; mode: FormMode }>(DIALOG_DATA);
  readonly mode = signal<FormMode>(this.data.mode);
  readonly entityId = signal<number | null>(this.data.id ?? null);

  constructor() {
    // Sin esto, Escape o el clic en el fondo cierran el diálogo con `undefined` mientras se guarda o se sube.
    effect(() => {
      this.dialogRef.disableClose = this.isSaving() || this.isUploadingImage() || this.created();
    });

    const data = this.data;
    this.imageUrl.set(data.category?.imageUrl ?? null);

    if (data.mode === 'edit' && data.category) {
      this.form = this.fb.group({
        name: this.fb.control(data.category.name, { nonNullable: true, validators: [Validators.required] }),
        description: this.fb.control(data.category.description ?? '', { nonNullable: true }),
        imageUrl: this.fb.control(data.category.imageUrl ?? '', { nonNullable: true }),
      });
    } else {
      this.form = this.fb.group({
        name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
        description: this.fb.control<string>('', { nonNullable: true }),
        imageUrl: this.fb.control<string>('', { nonNullable: true }),
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

    const id = this.entityId();
    if (this.mode() === 'edit' && id != null) {
      try {
        if (this.selectedImageFile() && !this.imageUrl()) {
          await this.uploadImageForEntity(id);
        }

        const body = this.form.getRawValue() as CategoryModel;
        body.imageUrl = this.imageUrl() || null;
        this.categoryService.editCategory(id, body).subscribe({
          next: () => {
            this.notificationService.success('Categoría actualizada correctamente.');
            this.dialogRef.close('updated');
          },
          error: () => {
            this.notificationService.error('No se pudo actualizar la categoría.');
            this.isSaving.set(false);
          },
        });
      } catch {
        this.isSaving.set(false);
      }
      return;
    }

    const body = this.form.getRawValue() as CategoryModel;
    body.imageUrl = null;
    try {
      const createdCategory = await firstValueFrom(this.categoryService.createCategory(body));
      if (this.selectedImageFile()) {
        try {
          await this.uploadImageForEntity(createdCategory.id, { notify: false });
        } catch {
          this.entityId.set(createdCategory.id);
          this.mode.set('edit');
          this.created.set(true);
          this.notificationService.error('Categoría creada, pero no se pudo subir la imagen. Puedes reintentarlo.');
          this.isSaving.set(false);
          return;
        }
      }
      this.notificationService.success('Categoría creada correctamente.');
      this.dialogRef.close('updated');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.notificationService.error('Límite de demo alcanzado');
        this.isSaving.set(false);
        return;
      }
      this.notificationService.error('No se pudo crear la categoría.');
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
    const id = this.entityId();
    if (!id) {
      this.imageError.set('Primero guarda la categoría para subir su imagen.');
      return;
    }

    try {
      await this.uploadImageForEntity(id);
    } catch {
      // El aviso ya lo dio uploadImageForEntity.
    }
  }

  async onDeleteImage() {
    if (!this.entityId()) {
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

  private async uploadImageForEntity(categoryId: number, options?: { notify: boolean }) {
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

      const response = await firstValueFrom(this.categoryService.uploadCategoryImage(categoryId, fileToUpload));
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
    const id = this.entityId();
    if (!id) {
      return;
    }

    this.isDeletingImage.set(true);
    try {
      const response = await firstValueFrom(this.categoryService.deleteCategoryImage(id));
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
