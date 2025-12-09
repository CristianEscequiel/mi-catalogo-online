import { Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from '../services/category.service';
import { CategoryModel } from '../models/category.model';
import { CategoryListComponent } from '../components/category-list.component';
import { CategoryFormComponent } from '../components/category-form.component';

@Component({
  standalone: true,
  selector: 'app-category-admin',
  imports: [CategoryListComponent, CategoryFormComponent],
  templateUrl: 'category-admin.html'
})
export class CategoryAdminComponent {
  categoryService = inject(CategoryService);
  fb = inject(FormBuilder);

  @ViewChild('listCmp') listCmp!: CategoryListComponent;
  activeTab: 'list' | 'create' = 'list';

  categoryForm = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string>('', { nonNullable: true }),
    imageUrl: this.fb.control<string>('', { nonNullable: true }),
  });

  setTab(tab: 'list' | 'create') {
    this.activeTab = tab;
    if (tab === 'list' && this.listCmp) {
      this.listCmp.reloadCategories();
    }
  }

  onCreate() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const body: CategoryModel = {
      ...this.categoryForm.getRawValue()
    };
    this.categoryService.createCategory(body).subscribe({
      next: () => {
        this.categoryForm.reset();
        this.setTab('list');
      },
      error: err => console.error(err),
    });
  }
}
