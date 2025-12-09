import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.html'
})
export class CategoryFormComponent {
  @Input() categoryForm!: FormGroup;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

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
}
