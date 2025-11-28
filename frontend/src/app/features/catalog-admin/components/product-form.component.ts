import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../services/product.service';
import { ProductModel } from '../models/product.model';

interface categoryModel {
  id:number;
  name:string;
  descripcion:string;
  imageUrl:string
}

@Component({
  standalone: true,
  selector: 'app-product-form',
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.html'
})
export class PrdFormComponent  implements OnInit{

  @Input() form!: FormGroup;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();


  loadingCategories = true;
  productService = inject(ProductService)
  fb = inject(FormBuilder)

  statuses = ['ARCHIVED', 'DRAFT', 'PUBLIC']
  categories: categoryModel[] = []

  productForm = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true ,  validators:[Validators.required] }),
    description: this.fb.control<string>('', { nonNullable: true}),
    slug: this.fb.control<string>(''),
    sku: this.fb.control<string>(''),
    price: this.fb.control<number>(0 , { nonNullable: true , validators: [Validators.required, Validators.min(0)] }),
    categoryIds: this.fb.control<number[]>([] ,{ nonNullable: true , validators: [] }),
    thumbnailUrl: this.fb.control<string | null>(null),
    status: this.fb.control<'DRAFT' | 'PUBLIC' | 'ARCHIVED'>('DRAFT', { nonNullable: true , validators: [Validators.required] }),
  });

  ngOnInit() {
  this.productService.getCategories().subscribe({
    next: res => {this.categories = res , this.loadingCategories = false} ,
    error: err => console.error(err),
  });
}
  view() {
    console.log(this.productForm.value)
  }

  createProduct(){
     if (this.productForm.invalid) {
    this.productForm.markAllAsTouched();
    return;
  }
    const body: ProductModel = {
      ...this.productForm.getRawValue()
    }
    this.productService.postProduct(body)

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
  } else {
    this.productForm.patchValue({
      categoryIds: current.filter(x => x !== id)
    });
  }
}
get selectedCategoriesNames(): string {
  const ids = this.productForm.value.categoryIds ?? [];
  const selected = this.categories.filter(c => ids.includes(c.id));
  if (selected.length === 0) {
    return 'Ninguna';
  }
  return selected.map(s => s.name).join(', ');
}


}
