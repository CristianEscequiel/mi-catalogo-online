import { Component, computed, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryResModel } from '../../../categories/models/category.model';
import { CategoryService } from '../../../categories/services/category.service';
import { ImageFieldComponent } from '../../../../../shared/components/image-field/image-field.component';
import { resolveImageUrl } from '../../../../../core/config/api.config';
import { AuthStore, UserLite } from '../../../../../core/state/auth.store';

type FormMode = 'create' | 'edit';

@Component({
  standalone: true,
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, ImageFieldComponent],
  templateUrl: './product-form.html'
})
export class PrdFormComponent implements OnInit {

  @Input() productForm!: FormGroup;
  @Input() mode: FormMode = 'create';
  @Input() imageUrl: string | null = null;
  @Input() imageError: string | null = null;
  @Input() isUploadingImage = false;
  @Input() isDeletingImage = false;
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() imageFileSelected = new EventEmitter<File | null>();
  @Output() uploadImage = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<void>();

  private store = inject(AuthStore);
  productService = inject(ProductService)
  categoryService = inject(CategoryService)
  fb = inject(FormBuilder)
  loadingCategories = true;
  statuses = ['ARCHIVED', 'DRAFT', 'PUBLIC']
  categories: CategoryResModel[] = []
  user: UserLite | null = computed(() => this.store.userLite() ?? null)();

  ngOnInit() {
    this.loadCategoriesByUserId(this.user?.id ?? 0);
  }
    loadCategoriesByUserId(id: number) {
    this.categoryService.getCategoriesByUserId(id).subscribe({
      next: res => {
        this.categories = res;
        this.loadingCategories = false;
      },
      error: err => console.error(err),
    });
  }

  createProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.submitForm.emit();
    if (this.mode === 'create') {
      this.productForm.reset();
    }
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

    if (selected.length === 0) return 'Ninguna';

    if (selected.length <= 2) {
      return selected.map(s => s.name).join(', ');
    }

    return `${selected[0].name}, ${selected[1].name} +${selected.length - 2}`;
  }

  onImageFileSelected(file: File | null) {
    this.imageFileSelected.emit(file);
  }

  onUploadImage() {
    this.uploadImage.emit();
  }

  onDeleteImage() {
    console.log('Requesting image deletion');
    this.deleteImage.emit();
  }

  resolvedImageUrl() {
    return resolveImageUrl(this.imageUrl);
  }

}
