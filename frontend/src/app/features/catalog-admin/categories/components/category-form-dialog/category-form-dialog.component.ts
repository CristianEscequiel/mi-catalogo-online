import { Component, inject, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CategoryModel } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { NotificationService } from '../../../../../core/services/notification.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../../../../shared/utils/image-replacement.helper';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-category-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, CategoryFormComponent, FontAwesomeModule],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
    <div class="flex p-1">
      @if (data.mode === 'edit') {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar categoria</h3>
      } @else {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Crear nueva categoria</h3>
      }
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>
    </div>
    <app-category-form
      [categoryForm]="form"
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
    </app-category-form>
  </div>
  `
})
export class CategoryFormDialogComponent {
  faTimes = faTimes;
  private dialog = inject(Dialog);
  form: FormGroup;
  imageUrl: string | null = null;
  imageError: string | null = null;
  selectedImageFile: File | null = null;
  isUploadingImage = false;
  isDeletingImage = false;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private notificationService: NotificationService,
    private dialogRef: DialogRef<'updated' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id?: number; category?: CategoryModel; mode: FormMode },
  ) {
    this.imageUrl = data.category?.imageUrl ?? null;

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.data.mode === 'edit' && this.data.id != null) {
      if (this.selectedImageFile && !this.imageUrl) {
        await this.uploadImageForEntity(this.data.id);
      }

      const body = this.form.getRawValue() as CategoryModel;
      body.imageUrl = this.imageUrl || null;
      this.categoryService.editCategory(this.data.id, body).subscribe({
        next: () => {
          this.notificationService.success('Categoría actualizada correctamente.');
          this.dialogRef.close('updated');
        },
        error: () => {
          this.notificationService.error('No se pudo actualizar la categoría.');
        },
      });
      return;
    }

    const body = this.form.getRawValue() as CategoryModel;
    body.imageUrl = null;
    try {
      const createdCategory = await firstValueFrom(this.categoryService.createCategory(body));
      if (this.selectedImageFile) {
        await this.uploadImageForEntity(createdCategory.id);
      }
      this.notificationService.success('Categoría creada correctamente.');
      this.dialogRef.close('updated');
    } catch {
      this.notificationService.error('No se pudo crear la categoría.');
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
    if (!this.data.id) {
      this.imageError = 'Primero guarda la categoría para subir su imagen.';
      return;
    }

    await this.uploadImageForEntity(this.data.id);
  }

  onDeleteImage() {
    if (!this.data.id) {
      this.imageUrl = null;
      this.selectedImageFile = null;
      return;
    }

    this.deleteImageFromEntity(true);
  }

  private async uploadImageForEntity(categoryId: number) {
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

      const response = await firstValueFrom(this.categoryService.uploadCategoryImage(categoryId, fileToUpload));
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
    if (!this.data.id) {
      return;
    }

    this.isDeletingImage = true;
    try {
      const response = await firstValueFrom(this.categoryService.deleteCategoryImage(this.data.id));
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
