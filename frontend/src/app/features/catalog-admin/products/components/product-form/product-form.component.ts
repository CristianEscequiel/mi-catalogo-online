import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, EventEmitter, inject, Input, OnInit, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { GenerateProductFromImageResponse, ProductService } from '../../../../../core/data-access/products/product.service';
import { CategoryResModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
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
  templateUrl: './product-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrdFormComponent implements OnInit, OnChanges {
  @Input() productForm!: FormGroup;
  @Input() mode: FormMode = 'create';
  @Input() imageUrl: string | null = null;
  @Input() imageError: string | null = null;
  @Input() isUploadingImage = false;
  @Input() isDeletingImage = false;
  @Input() isSaving = false;
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() imageFileSelected = new EventEmitter<File | null>();
  @Output() uploadImage = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<void>();

  private store = inject(AuthStore);
  private dialog = inject(Dialog);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  fb = inject(FormBuilder);
  readonly loadingCategories = signal(true);
  statuses = ['ARCHIVED', 'DRAFT', 'PUBLISHED'];
  readonly categories = signal<CategoryResModel[]>([]);
  user: UserLite | null = computed(() => this.store.userLite() ?? null)();
  readonly isGeneratingContent = signal(false);
  readonly isAnalyzingImage = signal(false);
  readonly isAiSectionOpen = signal(false);

  readonly localPreviewUrl = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imageUrl']?.currentValue) {
      this.localPreviewUrl.set(null);
    }
  }

  ngOnInit() {
    // El estado del FormGroup (valor, validez, touched) no es una señal: la IA lo cambia con setValue en
    // callbacks asíncronos. Con OnPush hay que avisar a la vista cuando el formulario emite cualquier evento.
    this.productForm.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.markForCheck());
    this.loadCategoriesByUserId(this.user?.id ?? 0);
  }

  loadCategoriesByUserId(id: number) {
    this.categoryService.getCategoriesByUserId(id).subscribe({
      next: (res) => {
        this.categories.set(res);
        this.loadingCategories.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loadingCategories.set(false);
      },
    });
  }

  createProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.submitForm.emit();
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
    const selected = this.categories().filter((category) => ids.includes(category.id));

    if (selected.length === 0) return 'Ninguna';
    if (selected.length <= 2) return selected.map((item) => item.name).join(', ');

    return `${selected[0].name}, ${selected[1].name} +${selected.length - 2}`;
  }

  onImageFileSelected(file: File | null) {
    this.selectedFile.set(file);
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

  displayImageUrl() {
    return this.localPreviewUrl() ?? this.resolvedImageUrl();
  }

  generate(name: string) {
    this.isGeneratingContent.set(true);
    this.productService.getDescriptionByAi(name).subscribe({
      next: (res) => {
        this.productForm.get('description')?.setValue(res.description);
        this.productForm.get('slug')?.setValue(res.slug);
        this.notificationService.success('Descripción y slug sugeridos.');
        this.isGeneratingContent.set(false);
      },
      error: () => {
        this.notificationService.error('No se pudo generar contenido desde nombre.');
        this.isGeneratingContent.set(false);
      }
    });
  }

  canAnalyzeImageWithAi() {
    return (
      (!!this.resolvedImageUrl() || !!this.selectedFile()) &&
      !this.loadingCategories() &&
      !this.isAnalyzingImage()
    );
  }

  toggleAiSection() {
    this.isAiSectionOpen.update((open) => !open);
  }

  analyzeImageWithAi() {
    const imageUrl = this.resolvedImageUrl();
    const file = this.selectedFile();
    if (!imageUrl && !file) {
      this.notificationService.error('Debes tener una imagen principal cargada para analizar.');
      return;
    }

    if (this.categories().length === 0) {
      this.notificationService.error('No hay categorías disponibles para sugerir una coincidencia.');
      return;
    }

    const categories = this.categories().map((category) => ({
      id: category.id,
      name: category.name,
    }));

    this.runImageAnalysis(
      imageUrl
        ? this.productService.generateFromImage({ imageUrl, categories })
        : this.productService.analyzeImageFile(file as File, categories),
    );
  }

  private runImageAnalysis(request$: Observable<GenerateProductFromImageResponse>) {
    this.isAnalyzingImage.set(true);

    let destroyed = false;
    this.destroyRef.onDestroy(() => (destroyed = true));

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (suggestions) => {
        const appliedCount = await this.applyImageSuggestions(suggestions);
        if (destroyed) {
          return;
        }
        if (appliedCount > 0) {
          this.notificationService.success('Sugerencias aplicadas desde imagen.');
          return;
        }
        this.notificationService.info('Se analizó la imagen, pero no hubo cambios para aplicar.');
      },
      error: () => {
        this.notificationService.error('No se pudo analizar la imagen con IA.');
        this.isAnalyzingImage.set(false);
      },
      complete: () => {
        this.isAnalyzingImage.set(false);
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
