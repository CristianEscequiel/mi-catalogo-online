import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CategoryResModel } from '../../../categories/models/category.model';

@Component({
  selector: 'app-category-mobile-card',
  standalone: true,
  templateUrl: './category-mobile-card.component.html',
})
export class CategoryMobileCardComponent {
  @Input({ required: true }) category!: CategoryResModel;

  @Output() edit = new EventEmitter<CategoryResModel>();
  @Output() remove = new EventEmitter<CategoryResModel>();

  onEdit() {
    this.edit.emit(this.category);
  }

  onDelete() {
    this.remove.emit(this.category);
  }

  slugText() {
    if (this.category.slug?.trim()) {
      return this.category.slug;
    }
    return this.category.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  productsCount() {
    if (typeof this.category.productsCount === 'number') {
      return this.category.productsCount;
    }
    return this.category.products?.length ?? 0;
  }
}
