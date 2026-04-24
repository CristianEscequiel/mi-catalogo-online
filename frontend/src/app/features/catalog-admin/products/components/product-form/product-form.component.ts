import { Component, computed, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { GenerateProductFromImageResponse, ProductService } from '../../services/product.service';
import { CategoryResModel } from '../../../categories/models/category.model';
import { CategoryService } from '../../../categories/services/category.service';
import { ImageFieldComponent } from '../../../../../shared/components/image-field/image-field.component';
import { resolveImageUrl } from '../../../../../core/config/api.config';
import { AuthStore, UserLite } from '../../../../../core/state/auth.store';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  @Input() isSaving = false;
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() imageFileSelected = new EventEmitter<File | null>();
  @Output() uploadImage = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<void>();

  private store = inject(AuthStore);
  private dialog = inject(Dialog);
  private notificationService = inject(NotificationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  fb = inject(FormBuilder);
  loadingCategories = true;
  statuses = ['ARCHIVED', 'DRAFT', 'PUBLISHED'];
  categories: CategoryResModel[] = [];
  user: UserLite | null = computed(() => this.store.userLite() ?? null)();
  isGeneratingContent = false;
  isAnalyzingImage = false;
  isAiSectionOpen = false;

  ngOnInit() {
    this.loadCategoriesByUserId(this.user?.id ?? 0);
  }

  loadCategoriesByUserId(id: number) {
    this.categoryService.getCategoriesByUserId(id).subscribe({
      next: (res) => {
        this.categories = res;
        this.loadingCategories = false;
      },
      error: (err) => console.error(err),
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
      return;
    }

    this.productForm.patchValue({
      categoryIds: current.filter((value: number) => value !== id)
    });
  }

  get selectedCategoriesNames(): string {
    const ids = this.productForm.value.categoryIds ?? [];
    const selected = this.categories.filter((category) => ids.includes(category.id));

    if (selected.length === 0) return 'Ninguna';
    if (selected.length <= 2) return selected.map((item) => item.name).join(', ');

    return `${selected[0].name}, ${selected[1].name} +${selected.length - 2}`;
  }

  onImageFileSelected(file: File | null) {
    this.imageFileSelected.emit(file);
  }

  onUploadImage() {
    this.uploadImage.emit();
  }

  onDeleteImage() {
    this.deleteImage.emit();
  }

  resolvedImageUrl() {
    return resolveImageUrl(this.imageUrl);
  }

  generate(name: string) {
    this.isGeneratingContent = true;
    this.productService.getDescriptionByAi(name).subscribe({
      next: (res) => {
        this.productForm.get('description')?.setValue(res.description);
        this.productForm.get('slug')?.setValue(res.slug);
        this.notificationService.success('Descripción y slug sugeridos.');
        this.isGeneratingContent = false;
      },
      error: () => {
        this.notificationService.error('No se pudo generar contenido desde nombre.');
        this.isGeneratingContent = false;
      }
    });
  }

  canAnalyzeImageWithAi() {
    return !!this.resolvedImageUrl() && !this.isAnalyzingImage;
  }

  toggleAiSection() {
    this.isAiSectionOpen = !this.isAiSectionOpen;
  }

  analyzeImageWithAi() {
    const imageUrl = this.resolvedImageUrl();
    if (!imageUrl) {
      this.notificationService.error('Debes tener una imagen principal cargada para analizar.');
      return;
    }

    if (this.categories.length === 0) {
      this.notificationService.error('No hay categorías disponibles para sugerir una coincidencia.');
      return;
    }

    this.isAnalyzingImage = true;

    this.productService
      .generateFromImage({
        imageUrl,
        categories: this.categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      })
      .subscribe({
        next: async (suggestions) => {
          const appliedCount = await this.applyImageSuggestions(suggestions);
          if (appliedCount > 0) {
            this.notificationService.success('Sugerencias aplicadas desde imagen.');
            return;
          }
          this.notificationService.info('Se analizó la imagen, pero no hubo cambios para aplicar.');
        },
        error: () => {
          this.notificationService.error('No se pudo analizar la imagen con IA.');
          this.isAnalyzingImage = false;
        },
        complete: () => {
          this.isAnalyzingImage = false;
        },
      });
  }

  private async applyImageSuggestions(suggestions: GenerateProductFromImageResponse): Promise<number> {
    let appliedCount = 0;

    appliedCount += await this.applyTextSuggestion('name', suggestions.name, 'nombre');
    appliedCount += await this.applyTextSuggestion('description', suggestions.description, 'descripción');
    appliedCount += await this.applyCategorySuggestion(suggestions.categoryId, suggestions.categoryName);
    appliedCount += await this.applyTextSuggestion('slug', suggestions.slug, 'slug');

    return appliedCount;
  }

  private async applyTextSuggestion(controlName: string, suggestedValue: string | null | undefined, label: string): Promise<number> {
    const normalizedSuggestedValue = (suggestedValue ?? '').trim();
    if (!normalizedSuggestedValue) {
      return 0;
    }

    const control = this.productForm.get(controlName);
    if (!control) {
      return 0;
    }

    const currentValue = String(control.value ?? '').trim();
    if (!currentValue) {
      control.setValue(normalizedSuggestedValue);
      return 1;
    }

    if (currentValue === normalizedSuggestedValue) {
      return 0;
    }

    const shouldReplace = await this.confirmReplacement(
      `El campo ${label} ya tiene contenido. ¿Quieres reemplazarlo con la sugerencia de IA?`,
    );
    if (!shouldReplace) {
      return 0;
    }

    control.setValue(normalizedSuggestedValue);
    return 1;
  }

  private async applyCategorySuggestion(categoryId: number | null, categoryName: string | null): Promise<number> {
    if (!categoryId) {
      return 0;
    }

    const control = this.productForm.get('categoryIds');
    if (!control) {
      return 0;
    }

    const normalizedCurrentIds = Array.isArray(control.value)
      ? control.value.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (normalizedCurrentIds.length === 0) {
      control.setValue([categoryId]);
      return 1;
    }

    if (normalizedCurrentIds.length === 1 && normalizedCurrentIds[0] === categoryId) {
      return 0;
    }

    const categoryLabel = categoryName ?? 'categoría sugerida';
    const shouldReplace = await this.confirmReplacement(
      `El campo categoría ya tiene contenido. ¿Quieres reemplazarlo por "${categoryLabel}"?`,
    );
    if (!shouldReplace) {
      return 0;
    }

    control.setValue([categoryId]);
    return 1;
  }

  private confirmReplacement(message: string): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Reemplazar contenido',
        message,
        confirmText: 'Reemplazar',
        cancelText: 'Conservar',
      },
    });

    return new Promise((resolve) => {
      ref.closed.subscribe((confirmed) => {
        resolve(!!confirmed);
      });
    });
  }
}
