import { Component, inject, OnInit } from '@angular/core';
import { CdkTableModule } from '@angular/cdk/table';
import { Dialog } from '@angular/cdk/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { CategoryResModel } from '../../models/category.model';
import { CategoryFormDialogComponent } from '../category-form-dialog/category-form-dialog.component';
import { CategoryWarnDialogComponent } from '../category-warn-dialog/category-warn-dialog.component';
import { AuthStore } from '../../../../../core/state/auth.store';
import { resolveImageUrl } from '../../../../../core/config/api.config';

@Component({
  standalone: true,
  selector: 'app-category-list',
  imports: [CdkTableModule, ReactiveFormsModule],
  templateUrl: 'category-list.html'
})
export class CategoryListComponent implements OnInit {
  private store = inject(AuthStore);
  categoryService = inject(CategoryService);
  dialog = inject(Dialog);

  displayedColumns: string[] = ['image', 'name', 'description', 'actions'];
  categories: CategoryResModel[] = [];
  filteredCategories: CategoryResModel[] = [];
  searchControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.loadCategoriesByUserId(this.store.userLite()?.id ?? 0);
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
  }
  // This method is currently not used, but it can be useful if we want to load all categories without filtering by user.
  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: res => {
        this.categories = res;
        this.applyFilters();
      },
      error: err => console.error(err),
    });
  }

  reloadCategories() {
    this.loadCategoriesByUserId(this.store.userLite()?.id ?? 0);
  }

  loadCategoriesByUserId(id: number) {
    this.categoryService.getCategoriesByUserId(id).subscribe({
      next: res => {
        this.categories = res;
        this.applyFilters();
      },
      error: err => console.error(err),
    });
  }

  applyFilters() {
    const term = this.searchControl.value.toLowerCase().trim();
    let data = [...this.categories];

    if (term) {
      data = data.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.description?.toLowerCase().includes(term) ?? false)
      );
    }

    this.filteredCategories = data;
  }

  onEdit(row: CategoryResModel) {
    const ref = this.dialog.open(CategoryFormDialogComponent, {
      data: { id: row.id, category: row, mode: 'edit' },
    });
    ref.closed.subscribe(result => {
      if (result === 'updated') {
        this.reloadCategories();
      }
    });
  }

  onCreate() {
    const ref = this.dialog.open(CategoryFormDialogComponent, {
      data: { mode: 'create' },
    });
    ref.closed.subscribe(result => {
      if (result === 'updated') {
        this.reloadCategories();
      }
    });
  }

  onDelete(row: CategoryResModel) {
    const ref = this.dialog.open(CategoryWarnDialogComponent, {
      data: { id: row.id, category: row },
    });
    ref.closed.subscribe(result => {
      if (result === 'deleted') {
        this.reloadCategories();
      }
    });
  }

  resolveImageUrl(imagePath?: string | null) {
    return resolveImageUrl(imagePath);
  }
}
