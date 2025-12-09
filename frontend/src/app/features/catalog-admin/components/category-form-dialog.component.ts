import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { CategoryModel } from '../models/category.model';
import { CategoryService } from '../services/category.service';
import { CategoryFormComponent } from './category-form.component';

@Component({
  standalone: true,
  selector: 'app-category-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, CategoryFormComponent],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
    <div class="flex p-1">
      <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar categoría</h3>
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">×</button>
    </div>
    <app-category-form
      [categoryForm]="form"
      mode="edit"
      (submitForm)="onSubmit()"
      (cancel)="onCancel()">
    </app-category-form>
  </div>
  `
})
export class CategoryFormDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private dialogRef: DialogRef<'updated' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id: number, category: CategoryModel }
  ) {
    this.form = this.fb.group({
      name: this.fb.control(data.category.name, { nonNullable: true, validators: [Validators.required] }),
      description: this.fb.control(data.category.description ?? '', { nonNullable: true }),
      imageUrl: this.fb.control(data.category.imageUrl ?? '', { nonNullable: true }),
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue() as CategoryModel;

    this.categoryService.editCategory(this.data.id, body).subscribe({
      next: () => { this.dialogRef.close('updated'); },
      error: err => console.error(err),
    });
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
