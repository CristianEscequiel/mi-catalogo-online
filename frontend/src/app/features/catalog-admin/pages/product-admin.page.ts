import { Component, inject } from '@angular/core';
import { PrdListComponent } from '../components/product-list.component';
import { PrdFormComponent } from "../components/product-form.component";
import { FormBuilder, Validators } from '@angular/forms';
import { ProductModel } from '../models/product.model';
import { ProductService } from '../services/product.service';

@Component({
  standalone: true,
  selector: 'app-prd-admin',
  imports: [PrdListComponent, PrdFormComponent, PrdFormComponent],
  templateUrl: 'product-admin.html'
})
export class PrdAdminComponet {
productService = inject(ProductService)
fb = inject(FormBuilder)

productForm = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string>('', { nonNullable: true }),
    slug: this.fb.control<string>(''),
    sku: this.fb.control<string>(''),
    price: this.fb.control<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    categoryIds: this.fb.control<number[]>([], { nonNullable: true, validators: [] }),
    thumbnailUrl: this.fb.control<string | null>(null),
    status: this.fb.control<'DRAFT' | 'PUBLIC' | 'ARCHIVED'>('DRAFT', { nonNullable: true, validators: [Validators.required] }),
  });
onCreate(){
  // CREAR PRODUCTO ANTIGUO
    const body: ProductModel = {
      ...this.productForm.getRawValue()
    }
    console.log(body)
    this.productService.postProduct(body)
}

}
