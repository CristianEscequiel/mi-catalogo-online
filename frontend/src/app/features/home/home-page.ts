import { Component, inject, OnInit } from '@angular/core';
import { ProductService } from '../catalog-admin/products/services/product.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [],
  templateUrl: './home-page.html'
})
export class HomePage implements OnInit {

productService = inject(ProductService)
  allProducts: any;

ngOnInit(): void {
  this.productService.getAllProducts().subscribe({
      next: res => { this.allProducts = res },
      error: err => console.error(err),
    });
}

addToCart( item: any){
  console.log(item)
}
}
