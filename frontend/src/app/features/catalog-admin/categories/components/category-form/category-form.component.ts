import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ImageFieldComponent } from '../../../../../shared/components/image-field/image-field.component';
import { resolveImageUrl } from '../../../../../core/config/api.config';

@Component({
  standalone: true,
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, ImageFieldComponent],
  templateUrl: './category-form.html'
})
export class CategoryFormComponent {
  @Input() categoryForm!: FormGroup;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() imageUrl: string | null = null;
  @Input() imageError: string | null = null;
  @Input() isUploadingImage = false;
  @Input() isDeletingImage = false;
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() imageFileSelected = new EventEmitter<File | null>();
  @Output() uploadImage = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<void>();

  submitCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.submitForm.emit();
    if (this.mode === 'create') {
      this.categoryForm.reset();
    }
  }

  onImageFileSelected(file: File | null) {
    this.imageFileSelected.emit(file);
  }

  resolvedImageUrl() {
    return resolveImageUrl(this.imageUrl);
  }
}
