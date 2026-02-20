import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

export type ProductPreviewStatus = 'DRAFT' | 'PUBLIC' | 'ARCHIVED';

export type ProductPreviewVm = {
  name: string;
  description: string;
  priceLabel: string;
  status: ProductPreviewStatus;
  statusLabel: string;
  thumbnailUrl?: string | null;
  warnings: string[];
};

@Component({
  standalone: true,
  selector: 'app-product-card-preview',
  imports: [NgOptimizedImage],
  templateUrl: './product-card-preview.component.html',
})
export class ProductCardPreviewComponent implements OnChanges {
  @Input({ required: true }) vm!: ProductPreviewVm;
  imageFailed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) {
      this.imageFailed = false;
    }
  }

  get showImage(): boolean {
    return !!this.vm?.thumbnailUrl && !this.imageFailed;
  }

  onImgError() {
    this.imageFailed = true;
  }
}
