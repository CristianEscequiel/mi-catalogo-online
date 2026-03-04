import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryResModel } from '../../../categories/models/category.model';
import { CategoryService } from '../../../categories/services/category.service';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form',
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.html'
})
export class PrdFormComponent implements OnInit {

  @Input() productForm!: FormGroup;
  @Input() mode: FormMode = 'create';
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  productService = inject(ProductService)
  categoryService = inject(CategoryService)
  fb = inject(FormBuilder)
  loadingCategories = true;
  statuses = ['ARCHIVED', 'DRAFT', 'PUBLIC']
  categories: CategoryResModel[] = []

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: res => { this.categories = res, this.loadingCategories = false },
      error: err => console.error(err),
    });
  }

  createProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.submitForm.emit()
    this.productForm.reset()
  }

  isSelected(id: number): boolean {
    return this.productForm.value.categoryIds?.includes(id) ?? false;
  }

  toggleCategory(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.productForm.value.categoryIds ?? [];

    if (checked) {
      this.productForm.patchValue({
        categoryIds: [...current, id]
      });
    } else {
      this.productForm.patchValue({
        categoryIds: current.filter((x: number) => x !== id)
      });
    }
  }

  get selectedCategoriesNames(): string {
    const ids = this.productForm.value.categoryIds ?? [];
    const selected = this.categories.filter(c => ids.includes(c.id));
    if (selected.length === 0) {
      return 'Ninguna';
    }
    return selected.map(s => s.name).join(', ');
  }

}
