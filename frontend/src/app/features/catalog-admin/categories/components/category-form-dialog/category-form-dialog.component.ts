import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { CategoryModel } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { CategoryFormComponent } from '../category-form/category-form.component';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-category-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, CategoryFormComponent],
  template: `
  <div class="bg-base-200 rounded-2xl shadow-xl max-w-xl w-full mx-auto p-2">
    <div class="flex p-1">
      @if (data.mode === 'edit') {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Editar categoria</h3>
      } @else {
        <h3 class="flex-1 mx-4 pt-2 text-lg font-bold mb-2">Crear nueva categoria</h3>
      }
      <button (click)="onCancel()" class="btn btn-sm btn-circle btn-ghost">&times;</button>
    </div>
    <app-category-form
      [categoryForm]="form"
      [mode]="data.mode"
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
    @Inject(DIALOG_DATA) public data: { id?: number, category?: CategoryModel, mode: FormMode }
  ) {
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue() as CategoryModel;

    if (this.data.mode === 'edit' && this.data.id != null) {
      this.categoryService.editCategory(this.data.id, body).subscribe({
        next: () => { this.dialogRef.close('updated'); },
        error: err => console.error(err),
      });
    } else {
      this.categoryService.createCategory(body).subscribe({
        next: () => { this.dialogRef.close('updated'); },
        error: err => console.error(err),
      });
    }
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
