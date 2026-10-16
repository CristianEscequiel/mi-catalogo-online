import { Component, inject } from '@angular/core';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { CategoryModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { NotificationService } from '../../../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-category-warn-dialog',
  imports: [CommonModule, DialogModule],
  template: `
    <div class="bg-base-200 rounded-2xl shadow-xl p-4">
      <h2 class="text-lg font-semibold mb-4">¿Desea eliminar esta categoría?</h2>

      <div class="flex items-center gap-4 p-4 border rounded-lg bg-base-200">
        <img [src]="data.category.imageUrl || 'https://placehold.co/100x100?text=Img'" alt="Categoría"
            class="w-24 h-24 object-cover rounded" />

        <div class="flex-1">
          <h3 class="text-xl font-bold">{{ data.category.name }}</h3>
          <p class="text-sm ">{{ data.category.description }}</p>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button class="btn btn-outline" (click)="onCancel()">Cancelar</button>
        <button class="btn btn-error" (click)="onConfirmDelete()">Eliminar</button>
      </div>
    </div>
  `
})
export class CategoryWarnDialogComponent {
  private categoryService = inject(CategoryService);
  private notificationService = inject(NotificationService);
  private dialogRef = inject<DialogRef<'deleted' | 'cancel'>>(DialogRef);
  data = inject<{ id: number, category: CategoryModel }>(DIALOG_DATA);

  onConfirmDelete() {
    this.categoryService.deleteCategory(this.data.id).subscribe({
      next: () => {
        this.notificationService.success('Categoría eliminada correctamente.');
        this.dialogRef.close('deleted');
      },
      error: () => {
        this.notificationService.error('No se pudo eliminar la categoría.');
      },
    });
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
