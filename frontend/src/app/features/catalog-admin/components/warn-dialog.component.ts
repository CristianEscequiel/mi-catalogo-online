import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { ProductModel } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { PrdFormComponent } from './product-form.component';

@Component({
  standalone: true,
  selector: 'app-product-warn-dialog',
  imports: [CommonModule, DialogModule],
  template: `
    <div class="bg-base-200 rounded-2xl shadow-xl p-4">
    <h2 class="text-lg font-semibold mb-4">¿Realmente desea eliminar este producto?</h2>

    <div class="flex items-center gap-4 p-4 border rounded-lg bg-base-200">
      <img [src]="data.product.thumbnailUrl || 'https://placehold.co/100x100?text=Img'" alt="Producto"
          class="w-24 h-24 object-cover rounded" />

      <div class="flex-1">
        <h3 class="text-xl font-bold">{{ data.product.name }}</h3>
        <p class="text-sm ">{{ data.product.description }}</p>
        <p class="mt-1 text-sm ">SKU: {{ data.product.sku }}</p>
        <p class="mt-1 text-base font-semibold text-red-600">$ {{ data.product.price }}</p>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-6">
      <button class="btn btn-outline" (click)="onCancel()">Cancelar</button>
      <button class="btn btn-error" (click)="onConfirmDelete()">Eliminar</button>
    </div>
  </div>
  `
})
export class ProductWarnDialogComponent {
  constructor(
    private productService: ProductService,
    private dialogRef: DialogRef<'deleted' | 'cancel'>,
    @Inject(DIALOG_DATA) public data: { id:number ,  product: ProductModel }
  ){}
  onConfirmDelete() {
    this.productService.deleteProduct(this.data.id).subscribe({
      next: res => { this.dialogRef.close('deleted')},
      error: err => console.error(err),
    });
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
