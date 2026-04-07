import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { resolveImageUrl } from '../../../../../core/config/api.config';
import { ProductResModel } from '../../../products/models/prd-res.model';

@Component({
  selector: 'app-product-mobile-card',
  standalone: true,
  imports: [CurrencyPipe, NgClass],
  templateUrl: './product-mobile-card.component.html',
})
export class ProductMobileCardComponent {
  @Input({ required: true }) product!: ProductResModel;

  @Output() view = new EventEmitter<ProductResModel>();
  @Output() edit = new EventEmitter<ProductResModel>();
  @Output() remove = new EventEmitter<ProductResModel>();

  onView() {
    this.view.emit(this.product);
  }

  onEdit() {
    this.edit.emit(this.product);
  }

  onDelete() {
    this.remove.emit(this.product);
  }

  resolvedImageUrl() {
    return resolveImageUrl(this.product.thumbnailUrl) ?? 'https://placehold.co/100x100?text=Sin+img';
  }

  subtitle() {
    return this.product.slug?.trim() || this.product.description?.trim() || '-';
  }
}
